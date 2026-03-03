#include <iostream>
#include <math.h>
#include <omp.h>
#include <string>
#include <vector>
#include <gsl/gsl_rng.h>
#include <gsl/gsl_randist.h>
#include "../include/define.h"
#include "../include/evolve.cuh"
#include "../include/geometry.h"
#include "../include/anchoring.h"
#include "../include/io.h"
#include "../include/monte_carlo.h"
#include "../include/parameters.h"
#include "../include/parameter_order.h"
#include "../include/potential.cuh"
#include "../include/stringGPU.cuh"
#include <cuda_runtime.h>
#include <cooperative_groups.h>
#include "../include/reduce.cuh"
namespace cg = cooperative_groups;
#include <curand_kernel.h>
using std::string;

// Simple CUDA error checking helper
#define CUDA_CHECK(call) do { \
  cudaError_t _e = (call); \
  if (_e != cudaSuccess) { \
    printf("CUDA error %s:%d: %s\n", __FILE__, __LINE__, cudaGetErrorString(_e)); \
    exit(20); \
  } \
} while (0)

__global__ void initRNG(curandState *const rngStates, const unsigned int seed, const unsigned int nStates)
{
  const unsigned int tid = blockIdx.x * blockDim.x + threadIdx.x;
  if (tid >= nStates) return;
  curand_init(seed, tid, 0, &rngStates[tid]);
}

__device__ float (*bulk_potentialGPU)(float ni[3], float nj[3], Parameters *params, float rij[3], int nk);
__device__ int (*xBoundary_GPU)(int &ii, int NN);
__device__ int (*yBoundary_GPU)(int &ii, int NN);
__device__ int (*zBoundary_GPU)(int &ii, int NN);
__device__ float *d_ns, *d_phi_s, *d_theta_s, *d_W;
__device__ float (*latice_Potential_GPU)(const nni fullni[20], Parameters *params);
__device__ p_Surface_Potential *d_Surface_Potential_GPU; 
__device__ void setNni(uint pos, int conditional , nni *nLocal, float *ni, int *pt) {
  if(conditional==1) {
    nLocal->x =ni[pos*3+0];
    nLocal->y =ni[pos*3+1];
    nLocal->z =ni[pos*3+2];
    nLocal->pt=pt[pos];
  }else{
    nLocal->pt=0;
  }
}
__global__ void get_Energy (float *ni, 
                            int *pt, 
                            Parameters *params, 
                            float *h_eLat) {
  int Nx=params->Nx;
  int Ny=params->Ny;
  int Nz=params->Nz;
  int idx=blockIdx.x*blockDim.x+threadIdx.x;
  if (idx>Nx*Ny*Nz-1) return;
  // idx = i + Nx*(j + Ny*k)
  int i = idx % Nx;
  int j = (idx / Nx) % Ny;
  int k = idx / (Nx * Ny);
  // nni nLocal[8+(params->neighbourKind==2?12:0)+(params->neighbourKind==3?20:0)];
  nni nLocal[28];
  
  int im=(i-1); int ip=(i+1);
  int jm=(j-1); int jp=(j+1);
  int km=(k-1); int kp=(k+1);
  int neighbour[6]={
                      xBoundary_GPU(ip,Nx), xBoundary_GPU(im,Nx),
                      yBoundary_GPU(jp,Ny), yBoundary_GPU(jm,Ny),
                      zBoundary_GPU(kp,Nz), zBoundary_GPU(km,Nz)
                    };
  if(pti(i,j,k)==0) {
    h_eLat[idx]=0;
    return;
  }

  setNni(i +Nx*(j +Ny*k ),1,&nLocal[0],ni,pt);
  setNni(ip+Nx*(j +Ny*k ),neighbour[0],&nLocal[1],ni,pt);
  setNni(im+Nx*(j +Ny*k ),neighbour[1],&nLocal[2],ni,pt);
  setNni(i +Nx*(jp+Ny*k ),neighbour[2],&nLocal[3],ni,pt);
  setNni(i +Nx*(jm+Ny*k ),neighbour[3],&nLocal[4],ni,pt);
  setNni(i +Nx*(j +Ny*kp),neighbour[4],&nLocal[5],ni,pt);
  setNni(i +Nx*(j +Ny*km),neighbour[5],&nLocal[6],ni,pt);
  if (nLocal[0].pt>1)
  {
    nLocal[7].x=d_ns[(i+Nx*(j+Ny*k))*3+0];
    nLocal[7].y=d_ns[(i+Nx*(j+Ny*k))*3+1];
    nLocal[7].z=d_ns[(i+Nx*(j+Ny*k))*3+2];  
    nLocal[7].pt=pt[(i+Nx*(j+Ny*k))];
    // printf("%g %g %g %d\n",nLocal[7].x,nLocal[7].y,nLocal[7].z,nLocal[7].pt ); 
  }
  if (params->neighbourKind >1) {
    setNni(ip+Nx*(jp+Ny*k),neighbour[0]*neighbour[2],&nLocal[8],ni,pt);
    setNni(ip+Nx*(jm+Ny*k),neighbour[0]*neighbour[3],&nLocal[9],ni,pt);
    setNni(ip+Nx*(j+Ny*kp),neighbour[0]*neighbour[4],&nLocal[10],ni,pt);
    setNni(ip+Nx*(j+Ny*km),neighbour[0]*neighbour[5],&nLocal[11],ni,pt);
    setNni(im+Nx*(jp+Ny*k),neighbour[1]*neighbour[2],&nLocal[12],ni,pt);
    setNni(im+Nx*(jm+Ny*k),neighbour[1]*neighbour[3],&nLocal[13],ni,pt);
    setNni(im+Nx*(j+Ny*kp),neighbour[1]*neighbour[4],&nLocal[14],ni,pt);
    setNni(im+Nx*(j+Ny*km),neighbour[1]*neighbour[5],&nLocal[15],ni,pt);
    setNni(i+Nx*(jp+Ny*kp),neighbour[2]*neighbour[4],&nLocal[16],ni,pt);
    setNni(i+Nx*(jp+Ny*km),neighbour[2]*neighbour[5],&nLocal[17],ni,pt);
    setNni(i+Nx*(jm+Ny*kp),neighbour[3]*neighbour[4],&nLocal[18],ni,pt);
    setNni(i+Nx*(jm+Ny*km),neighbour[3]*neighbour[5],&nLocal[19],ni,pt);
  }  
  if (params->neighbourKind == 3 ) {
    setNni(ip+Nx*(jp+Ny*kp),neighbour[0]*neighbour[2]*neighbour[4],&nLocal[20],ni,pt);
    setNni(ip+Nx*(jp+Ny*km),neighbour[0]*neighbour[2]*neighbour[5],&nLocal[21],ni,pt);
    setNni(ip+Nx*(jm+Ny*kp),neighbour[0]*neighbour[3]*neighbour[4],&nLocal[22],ni,pt);
    setNni(ip+Nx*(jm+Ny*km),neighbour[0]*neighbour[3]*neighbour[5],&nLocal[23],ni,pt);
    setNni(im+Nx*(jp+Ny*kp),neighbour[1]*neighbour[2]*neighbour[4],&nLocal[24],ni,pt);
    setNni(im+Nx*(jp+Ny*km),neighbour[1]*neighbour[2]*neighbour[5],&nLocal[25],ni,pt);
    setNni(im+Nx*(jm+Ny*kp),neighbour[1]*neighbour[3]*neighbour[4],&nLocal[26],ni,pt);
    setNni(im+Nx*(jm+Ny*km),neighbour[1]*neighbour[3]*neighbour[5],&nLocal[27],ni,pt);
  }
  h_eLat[idx]=latice_Potential_GPU(nLocal, params);
}
__global__ void callMCGPU(dim3 tick,
                          int di,
                          int dj,
                          int dk,
                          float *d_ni,
                          int *d_pt,
                          float *d_T,
                          float ang_var,
                          curandState *const d_rngStates,
                          unsigned int *d_acc,
                          Parameters *d_params) {
  EvolveNGPU::MC_GPU(tick, di, dj, dk, d_ni, d_pt, d_T, ang_var, d_rngStates, d_acc, d_params);
}

__device__ void EvolveNGPU::MC_GPU (dim3 tick, 
                                    int di, 
                                    int dj, 
                                    int dk, 
                                    float *ni, 
                                    int *pt, 
                                    float *d_T, 
                                    float ang_var, 
                                    curandState *const rngStates, 
                                    unsigned int *acceptance, 
                                    Parameters *params) {
  int Nx=params->Nx;
  int Ny=params->Ny;
  int Nz=params->Nz;
  float fPi=M_PI;
  int Idx=blockIdx.x*blockDim.x+threadIdx.x;
  // Kernels may launch with more threads than tick.x*tick.y*tick.z.
  // Guard before reading rngStates[Idx].
  const int nStates = (int)(tick.x * tick.y * tick.z);
  if (Idx >= nStates) return;
  int iBox=Idx%tick.x;
  int jBox=((Idx)/tick.x)%tick.y;
  int kBox=Idx/(tick.x*tick.y);
  curandState *localState = &rngStates[Idx];
  float T=*d_T;
  const int nti=28;
  nni nLocal[nti];
  
    float E_new=0, E_old=0, va, ranVal;
    int i,j,k;
    float nNew[3]; 
    float rotation_type;
    i=di+iBox*2;     if (i>=Nx) return;
    j=dj+jBox*2;     if (j>=Ny) return;
    k=dk+kBox*2;     if (k>=Nz) return;
    int ii=i+Nx*(j+Ny*k);
      acceptance[ii]=0;
    if (pti(i,j,k)==0) {
      return;
    }
    va= (2*curand_uniform(localState)-1)*ang_var; 
    //Create a rotation candidate
    rotation_type=curand_uniform(localState);
    if (rotation_type < 0.333) {
      nNew[0]=nix(i,j,k);
      nNew[1]=niy(i,j,k)*cosf(fPi*va)+niz(i,j,k)*sinf(fPi*va);
      nNew[2]=niz(i,j,k)*cosf(fPi*va)-niy(i,j,k)*sinf(fPi*va);
    }
    else if (rotation_type < 0.666) {
      nNew[0]=nix(i,j,k)*cosf(fPi*va)-niz(i,j,k)*sinf(fPi*va);
      nNew[1]=niy(i,j,k);
      nNew[2]=niz(i,j,k)*cosf(fPi*va)+nix(i,j,k)*sinf(fPi*va);
    }else  {
      nNew[0]=nix(i,j,k)*cosf(fPi*va)+niy(i,j,k)*sinf(fPi*va);
      nNew[1]=niy(i,j,k)*cosf(fPi*va)-nix(i,j,k)*sinf(fPi*va);
      nNew[2]=niz(i,j,k);
    }
    float norm = sqrtf(nNew[0] * nNew[0] + nNew[1] * nNew[1] + nNew[2] * nNew[2]);
    nNew[0] /= norm;
    nNew[1] /= norm;
    nNew[2] /= norm;
    int im=(i-1); int ip=(i+1);
    int jm=(j-1); int jp=(j+1);
    int km=(k-1); int kp=(k+1);
    int neighbour[6]={
                        xBoundary_GPU(ip,Nx), xBoundary_GPU(im,Nx),
                        yBoundary_GPU(jp,Ny), yBoundary_GPU(jm,Ny),
                        zBoundary_GPU(kp,Nz), zBoundary_GPU(km,Nz)
                      };
    setNni(i +Nx*(j +Ny*k ),1,&nLocal[0],ni,pt);
    setNni(ip+Nx*(j +Ny*k ),neighbour[0],&nLocal[1],ni,pt);
    setNni(im+Nx*(j +Ny*k ),neighbour[1],&nLocal[2],ni,pt);
    setNni(i +Nx*(jp+Ny*k ),neighbour[2],&nLocal[3],ni,pt);
    setNni(i +Nx*(jm+Ny*k ),neighbour[3],&nLocal[4],ni,pt);
    setNni(i +Nx*(j +Ny*kp),neighbour[4],&nLocal[5],ni,pt);
    setNni(i +Nx*(j +Ny*km),neighbour[5],&nLocal[6],ni,pt);
    if (nLocal[0].pt > 1)
    {
      nLocal[7].x=d_ns[(i+Nx*(j+Ny*k))*3+0];
      nLocal[7].y=d_ns[(i+Nx*(j+Ny*k))*3+1];
      nLocal[7].z=d_ns[(i+Nx*(j+Ny*k))*3+2];  
      nLocal[7].pt=pt[(i+Nx*(j+Ny*k))];
    }
    if (params->neighbourKind >1) {
      setNni(ip+Nx*(jp+Ny*k ),neighbour[0]*neighbour[2],&nLocal[ 8],ni,pt);
      setNni(ip+Nx*(jm+Ny*k ),neighbour[0]*neighbour[3],&nLocal[ 9],ni,pt);
      setNni(ip+Nx*(j +Ny*kp),neighbour[0]*neighbour[4],&nLocal[10],ni,pt);
      setNni(ip+Nx*(j +Ny*km),neighbour[0]*neighbour[5],&nLocal[11],ni,pt);
      setNni(im+Nx*(jp+Ny*k ),neighbour[1]*neighbour[2],&nLocal[12],ni,pt);
      setNni(im+Nx*(jm+Ny*k ),neighbour[1]*neighbour[3],&nLocal[13],ni,pt);
      setNni(im+Nx*(j +Ny*kp),neighbour[1]*neighbour[4],&nLocal[14],ni,pt);
      setNni(im+Nx*(j +Ny*km),neighbour[1]*neighbour[5],&nLocal[15],ni,pt);
      setNni(i +Nx*(jp+Ny*kp),neighbour[2]*neighbour[4],&nLocal[16],ni,pt);
      setNni(i +Nx*(jp+Ny*km),neighbour[2]*neighbour[5],&nLocal[17],ni,pt);
      setNni(i +Nx*(jm+Ny*kp),neighbour[3]*neighbour[4],&nLocal[18],ni,pt);
      setNni(i +Nx*(jm+Ny*km),neighbour[3]*neighbour[5],&nLocal[19],ni,pt);
    } 
    if (params->neighbourKind == 3 ) {
      setNni(ip+Nx*(jp+Ny*kp),neighbour[0]*neighbour[2]*neighbour[4],&nLocal[20],ni,pt);
      setNni(ip+Nx*(jp+Ny*km),neighbour[0]*neighbour[2]*neighbour[5],&nLocal[21],ni,pt);
      setNni(ip+Nx*(jm+Ny*kp),neighbour[0]*neighbour[3]*neighbour[4],&nLocal[22],ni,pt);
      setNni(ip+Nx*(jm+Ny*km),neighbour[0]*neighbour[3]*neighbour[5],&nLocal[23],ni,pt);
      setNni(im+Nx*(jp+Ny*kp),neighbour[1]*neighbour[2]*neighbour[4],&nLocal[24],ni,pt);
      setNni(im+Nx*(jp+Ny*km),neighbour[1]*neighbour[2]*neighbour[5],&nLocal[25],ni,pt);
      setNni(im+Nx*(jm+Ny*kp),neighbour[1]*neighbour[3]*neighbour[4],&nLocal[26],ni,pt);
      setNni(im+Nx*(jm+Ny*km),neighbour[1]*neighbour[3]*neighbour[5],&nLocal[27],ni,pt);
    }  
    //Old energy calculation
    E_old=latice_Potential_GPU(nLocal, params);
    //New energy calculation
    nLocal[0].x = nNew[0];
    nLocal[0].y = nNew[1];
    nLocal[0].z = nNew[2];
    E_new=latice_Potential_GPU(nLocal, params);
  
    //test new config
    ranVal=curand_uniform(localState);
    if (ranVal<=expf(-(E_new-E_old)/T) )
    {
      nix(i,j,k) = nNew[0];
      niy(i,j,k) = nNew[1];
      niz(i,j,k) = nNew[2];
      acceptance[ii]=1;
    }else{
      acceptance[ii]=0;
    }
}

__global__ void setGPUup(Parameters *params, int n_surf) {
    if ( d_strcmp(params->potential,"ll")*d_strcmp(params->potential,"lebwohl-lahser")==0 ) {
     bulk_potentialGPU=&Bulk_Energy_Lebwohl_Lasher_GPU;
     printf("Using lebwohl-lasher potential\n");
   }else if (d_strcmp(params->potential,"ghrl")*d_strcmp(params->potential,"grun-hess")==0 ) {
     bulk_potentialGPU=&Bulk_Energy_GHRL_GPU;
     printf("Using gruhn-hess potential\n");
   }else if ( d_strcmp(params->potential,"pear")==0 ) {
     bulk_potentialGPU=&Bulk_Energy_Selinger_Pear_GPU;
     printf("Using splay-bend potential\n");
   }else{
     printf("%s potential not programed.\n Try lebwohl-lasher(LL), pear, BC or gruhn-hess(GHRL)",params->potential);
   }
   if(d_strcmp(params->XBoundtype,"free")==0) xBoundary_GPU = &Free_Boundary_GPU;
   else if (d_strcmp(params->XBoundtype,"periodic")==0) xBoundary_GPU = &Periodic_Boundary_GPU;

   if(d_strcmp(params->YBoundtype,"free")==0) yBoundary_GPU = &Free_Boundary_GPU;
   else if (d_strcmp(params->YBoundtype,"periodic")==0) yBoundary_GPU = &Periodic_Boundary_GPU;

   if(d_strcmp(params->ZBoundtype,"free")==0) zBoundary_GPU = &Free_Boundary_GPU;
   else if (d_strcmp(params->ZBoundtype,"periodic")==0) zBoundary_GPU = &Periodic_Boundary_GPU;
   
   if ( d_strcmp(params->geometry,"bulk")==0 )
     latice_Potential_GPU =  Bulk_latice_Potential_GPU;
   else if ( d_strcmp(params->geometry,"slab")==0 )
     latice_Potential_GPU =  Slab_latice_Potential_GPU;
   else if ( d_strcmp(params->geometry,"sphere")==0 )
     latice_Potential_GPU =  Sphere_latice_Potential_GPU;
   else if ( d_strcmp(params->geometry,"custom")==0 )
     latice_Potential_GPU = Custom_latice_Potential_GPU;
}
__global__ void passGPUns(float *host, float *h_W) {
  d_ns=host;
  d_W=h_W;
}
__global__ void setSurfaces(p_Surface_Potential *host, int nSurfaces, char *surface_names, int ii) {
  d_Surface_Potential_GPU=host;
       if ( d_strcmp(surface_names,"Homeotropic Anchoring")==0)
          d_Surface_Potential_GPU[ii]=RP_Surface_Potential_GPU;
       else if ( d_strcmp(surface_names,"Founier-Galatola like Anchoring")==0)
          d_Surface_Potential_GPU[ii]=FG_Surface_Potential_GPU;
       else if ( d_strcmp(surface_names,"Rapine Papoular Anchoring")==0)
          d_Surface_Potential_GPU[ii]=RP_Surface_Potential_GPU;
       else if ( d_strcmp(surface_names,"Strong Anchoring")==0)
          d_Surface_Potential_GPU[ii]=Strong_Anchoring_GPU;
       else if ( d_strcmp(surface_names,"Homeotropic Anchoring GHRL")==0)
          d_Surface_Potential_GPU[ii]=RP_Surface_Potential_GHRL_GPU;
       else if ( d_strcmp(surface_names,"Founier-Galatola like Anchoring GHRL")==0)
          d_Surface_Potential_GPU[ii]=FG_Surface_Potential_GHRL_GPU;
       else if ( d_strcmp(surface_names,"Rapine Papoular Anchoring GHRL")==0)
          d_Surface_Potential_GPU[ii]=RP_Surface_Potential_GHRL_GPU;
       else if ( d_strcmp(surface_names,"Strong Anchoring GHRL")==0)
          d_Surface_Potential_GPU[ii]=Strong_Anchoring_GHRL_GPU;
    printf("GPU: %s\n",surface_names);
    
}
__global__ void setELat(double *h_eLat) {
  h_eLat[0]=1;
}

void EvolveNGPU::Monte_Carlo_Step_GPU(float &ang_var, gsl_rng * r) {
  // NOTE: 'r' is kept for API compatibility; GPU uses curand.
  static unsigned int nThread=8;
  static int redSteps, redSteps2, nRed, maxNThread, vallid=0;
  static int Nt=params->Nx*params->Ny*params->Nz;
  static bool setupGPU=true;
  if (cudaGetLastError()!=cudaSuccess) {
    printf("error before Setup Step\n"); exit(20);
  }
  p_Surface_Potential *Surface_Potential;
  if (setupGPU)
  {
    int nSurfaces=geometry->nSurfaces;
    for (int ii=0; ii<Nt; ii++)
      vallid+=pt[ii]?1:0;
    cudaDeviceGetAttribute(&maxNThread,cudaDevAttrMaxThreadsPerBlock,0);
    for (nThread=128; nThread>1; nThread/=2)
    {
      if(maxNThread > nThread && tick.x*tick.y*tick.z >= nThread) 
        break;
    }
    setGPUup<<<1,1>>>(d_params,nSurfaces);
    
    char *d_surfaceNames;
    cudaMalloc(&Surface_Potential, nSurfaces*sizeof(p_Surface_Potential));
    char *surfaceNames=(char*)malloc(50*sizeof(char));//[nSurfaces][50];
    cudaMalloc(&d_surfaceNames, 50*sizeof(char));
    float *local_W=(float*) malloc(nSurfaces*sizeof(float));
    for (int ii=0; ii<nSurfaces; ii++)
    {
      int wScale=1;
      if (params->neighbourKind==2)
        wScale=4;
      local_W[ii]=wScale*params->W[ii];
      sprintf(surfaceNames,"%s",geometry->surfaces[ii]->getName());
      cudaMemcpy(d_surfaceNames,surfaceNames, 50*sizeof(char),cudaMemcpyHostToDevice);
    printf("%s\n",surfaceNames  );
      setSurfaces<<<1,1>>>(Surface_Potential,nSurfaces,d_surfaceNames,ii);
      if (strcasecmp(surfaceNames,"Rapine Papoular Anchoring")*strcasecmp(surfaceNames,"Rapine Papoular Anchoring GHRL")==0) 
      {
        for (int i=0; i<params->Nx; i++)
        {
          for (int j=0; j<params->Ny; j++)
          {
            for (int k=0; k<params->Nz; k++)
            {
              if(pti(i,j,k)==ii+2)
              {
                geometry->ns[(i+Nx*(j+Ny*k))*3+0]=sinf(params->theta_s[ii]*M_PI/180)*cosf(params->phi_s[ii]*M_PI/180);
                geometry->ns[(i+Nx*(j+Ny*k))*3+1]=sinf(params->theta_s[ii]*M_PI/180)*sinf(params->phi_s[ii]*M_PI/180);
                geometry->ns[(i+Nx*(j+Ny*k))*3+2]=cosf(params->theta_s[ii]*M_PI/180);
              }
            }
          }
        }
      }
    }
    cudaFree(d_surfaceNames);
    // Keep these allocations for the lifetime of the EvolveNGPU object.
    if (!d_ns_buf) CUDA_CHECK(cudaMalloc(&d_ns_buf, 3*Nt*sizeof(float)));
    if (!d_W_buf)  CUDA_CHECK(cudaMalloc(&d_W_buf,  nSurfaces*sizeof(float)));

    CUDA_CHECK(cudaMemcpy(d_ns_buf, geometry->ns, 3*Nt*sizeof(float), cudaMemcpyHostToDevice));
    CUDA_CHECK(cudaMemcpy(d_W_buf,  local_W,      nSurfaces*sizeof(float), cudaMemcpyHostToDevice));
    passGPUns<<<1,1>>>(d_ns_buf, d_W_buf);
    CUDA_CHECK(cudaGetLastError());
    free(local_W); 
    {
      redSteps2=1;
      redSteps=Nt;
      nRed=0;
      while (true) {
        if(redSteps<maxNThread) {
          break;
        }
        redSteps2*=2;
        redSteps=redSteps/2+((redSteps%2==0)?0:1);
        nRed++;
      }
    }
    setupGPU=false; 
  }
  
  unsigned int acceptance;
  static unsigned int *acc=(unsigned int *)malloc(Nt*sizeof(unsigned int ));
  static int thr = nThread;
  static int blk = (tick.x*tick.y*tick.z)/thr+((tick.x*tick.y*tick.z)%thr?1:0);

  if (cudaGetLastError()!=cudaSuccess) {
    printf("error in Setup Step\n"); exit(20);
  }
  acceptance=0;
    for(int di=0; di<(2); di++) {
      for(int dj=0; dj<(2); dj++) {
        for(int dk=0; dk<(2); dk++) {
          callMCGPU<<<blk,thr>>>(tick, di, dj, dk, d_ni, d_pt, d_T, ang_var, d_rngStates, d_acc, d_params);
      }
    }
  }
  
  if (cudaGetLastError()!=cudaSuccess) {
    printf("error in MC Step\n"); exit(20);
  }
    reduce_sum<<<redSteps2,redSteps,redSteps*sizeof(int)>>>(d_acc,d_acc,Nt);
    int stepsToGo=redSteps2;
    while (stepsToGo>1) {
      int thisStep=stepsToGo;
      for (int ii=maxNThread; ii>1; ii>>=1) {
        if (ii<=stepsToGo) {
          thisStep=ii;
          stepsToGo/=ii;
          break;
        }
      }
      reduce_sum<<<stepsToGo,thisStep,thisStep*sizeof(int)>>>(d_acc,d_acc,Nt); 
    }
    cudaDeviceSynchronize();
    cudaMemcpy( &acceptance, d_acc, sizeof(unsigned int), cudaMemcpyDeviceToHost);
   if (1.0*acceptance/vallid<0.5) {
      ang_var*=0.99;
      if(ang_var<0.01) ang_var=0.01;
   }else if (1.0*acceptance/vallid>0.5) {
      ang_var/=0.99;
      if(ang_var > 1.0) {ang_var-=0.5;}
   }
   if (cudaGetLastError()!=cudaSuccess) {
     printf("error in cuda Step\n"); exit(20);
   }
}

float EvolveNGPU::energy_calculator_GPU() {
  static int redSteps, redSteps2, nBlocks, vallid=0;
  static float *d_eLat;
  static int Nt=params->Nx*params->Ny*params->Nz;
  static bool setUp=true;
  static int maxNThread;
  if(setUp) {
    //Memory Allocation
    CUDA_CHECK(cudaMalloc(&d_eLat, Nt*sizeof(float)));
    for (int ii=0; ii<Nt; ii++)
      vallid+=pt[ii]?1:0;
    cudaDeviceGetAttribute(&maxNThread,cudaDevAttrMaxThreadsPerBlock,0);
    nBlocks=Nt/32+(Nt%32?1:0);
    redSteps2=1;
    redSteps=Nt;
    while (true) {
      if(redSteps<maxNThread) {
        break;
      }
      redSteps2*=maxNThread;
      redSteps=redSteps/maxNThread+((redSteps%maxNThread==0)?0:1);
    }
    setUp=false;
  }
   CUDA_CHECK(cudaGetLastError());
  
   get_Energy<<<nBlocks,32>>>(d_ni, d_pt, d_params, d_eLat);
   CUDA_CHECK(cudaGetLastError());
   CUDA_CHECK(cudaDeviceSynchronize());

   reduce_sum<<<redSteps2,redSteps,redSteps*sizeof(float)>>>(d_eLat,d_eLat,Nt);
   for (int ii=redSteps2; ii>1; ii/=maxNThread) {
     reduce_sum<<<ii/maxNThread?ii/maxNThread:1,maxNThread,maxNThread*sizeof(float)>>>(d_eLat,d_eLat,Nt); 
   }
   CUDA_CHECK(cudaGetLastError());
   CUDA_CHECK(cudaDeviceSynchronize());
   float Ehost = 0.0f;
   CUDA_CHECK(cudaMemcpy(&Ehost, d_eLat, sizeof(float), cudaMemcpyDeviceToHost));
   return Ehost / vallid;
}

EvolveNGPU::~EvolveNGPU() {
  // Free device allocations we own. Safe even if nullptr.
  if (d_rngStates) CUDA_CHECK(cudaFree(d_rngStates));
  if (d_ni)        CUDA_CHECK(cudaFree(d_ni));
  if (d_pt)        CUDA_CHECK(cudaFree(d_pt));
  if (d_T)         CUDA_CHECK(cudaFree(d_T));
  if (d_params)    CUDA_CHECK(cudaFree(d_params));
  if (d_acc)       CUDA_CHECK(cudaFree(d_acc));
  if (d_ns_buf)    CUDA_CHECK(cudaFree(d_ns_buf));
  if (d_W_buf)     CUDA_CHECK(cudaFree(d_W_buf));

  d_rngStates = 0;
  d_ni = 0;
  d_pt = 0;
  d_T = 0;
  d_params = 0;
  d_acc = 0;
  d_ns_buf = 0;
  d_W_buf = 0;
}