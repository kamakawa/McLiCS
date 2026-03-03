#include <iostream>
#include <string>
#include <math.h>
#include <gsl/gsl_rng.h>
#include <omp.h>
#include "../include/define.h"
#include "../include/evolve.h"
#include "../include/evolve.cuh"
#include "../include/geometry.h"
#include "../include/io.h"
#include "../include/monte_carlo.h"
#include "../include/parameters.h"
#include "../include/parameter_order.h"
#include "../include/potential.h"
#include <cuda_runtime.h>
#include <curand_kernel.h>
#include <ctime>
using std::string;

quenchEvolveNGPU::quenchEvolveNGPU(float *ni, int *ppt, Parameters *params)
:Nx(params->Nx),Ny(params->Ny),Nz(params->Nz),EvolveNGPU(ni,ppt,params){
printf("Initializing Step loop:\n");
printf("Initial File Number= %d\n",params->first_file);
printf("Last File Number= %d\n\n",params->first_file+params->fn);
this->ni=ni;
this->pt=ppt;
this->params=params;
d_params=EvolveNGPU::d_params;
}; 

int quenchEvolveNGPU::run(){
  
//~   float BCB, CBC,P1,V1,B1,C1,vec_nt[3];
  float Nt=Nx*Ny*Nz;
  float S1, S2, sTemp;
  float tempE, E2, E;
  float vec_n[3] ;
  float mat_n[9] ;
  float ang_var=0.5;
  char fname[1000];
  
  tick={(unsigned int)Nx/2+Nx%2,(unsigned int) Ny/2+Ny%2,(unsigned int) Nz/2+Nz%2};

  cudaError_t cudaResult = cudaSuccess;
  
  cudaResult = cudaMalloc(&d_rngStates, tick.x*tick.y*tick.z * sizeof(curandState));
  if (cudaResult != cudaSuccess) {
    string msg("Could not allocate memory on device for RNG states: ");
    msg += cudaGetErrorString(cudaResult);
    throw std::runtime_error(msg);
  }
    
  cudaMalloc((void **)&d_ni, 3*Nt*sizeof(float));
  cudaMalloc((void **)&d_pt, Nt*sizeof(int));
  cudaMalloc((void **)&d_T, sizeof(float));
  cudaMalloc((void **)&d_params, sizeof(Parameters));
  cudaMalloc((void **)&d_acc, Nt*sizeof(unsigned int));  
  
  cudaMemcpy(d_ni, ni, 3*Nt*sizeof(float), cudaMemcpyHostToDevice);
  cudaMemcpy(d_pt, pt, Nt*sizeof(int), cudaMemcpyHostToDevice);
  cudaMemcpy(d_params, params, sizeof(Parameters), cudaMemcpyHostToDevice);
//~   cudaMemcpy(d_acc, &acceptance, sizeof(unsigned int), cudaMemcpyHostToDevice);
  // Initialize GPU RNG states (1D launch)
  const unsigned int nStates = tick.x * tick.y * tick.z;
  const int rngThreads = 256;
  const int rngBlocks  = (nStates + rngThreads - 1) / rngThreads;
  initRNG<<<rngBlocks, rngThreads>>>(d_rngStates, 1u, nStates);
  cudaDeviceSynchronize();
  cudaMemcpy(d_T, &params->T, sizeof(float), cudaMemcpyHostToDevice);
    
//~   int num_threads=omp_get_max_threads();
  // Host RNG (kept for API compatibility; GPU uses curand)
  gsl_rng_env_setup();
  gsl_rng * rng = gsl_rng_alloc(gsl_rng_default);
  gsl_rng_set(rng, (unsigned long)time(nullptr));
  
  sprintf(fname,"po.dat");
  FILE *po_file=fopen(fname,"a");
  fprintf(po_file,"ii S varS E varE\n"); fflush(po_file);
  printf("Step relaxation, for nematic molecules, using MCT=%d at T=%g and MCT=%d and MCS=%d at T=%g and fn=%d\n",
  params->MCT, params->Ti, (int)(params->MCT*params->dT),params->MCS, params->Tf,params->fn); fflush(stdout);
  for (int ii=params->first_file; ii< params->fn+params->first_file; ii++){
    params->T=params->Ti; cudaMemcpy(d_T, &params->T, sizeof(float), cudaMemcpyHostToDevice);
    for(int step=0; step<params->MCT; step++){
      Monte_Carlo_Step_GPU(ang_var,rng);
    }
    params->T=params->Tf; cudaMemcpy(d_T, &params->T, sizeof(float), cudaMemcpyHostToDevice);
    for(int step=0; step<(int)(params->MCT*params->dT); step++){
      Monte_Carlo_Step_GPU(ang_var,rng);
    }

    S1=0;S2=0;E=0;E2=0;
    for(int step=0; step<params->MCS; step++){
      Monte_Carlo_Step_GPU(ang_var,rng);
      tempE=energy_calculator_GPU();
      E2+=tempE*tempE;
      E +=tempE;
      cudaMemcpy( ni, d_ni, 3*Nt*sizeof(float), cudaMemcpyDeviceToHost);
      Matrice_constructor(ni,mat_n,pt,*params);
      sTemp=Eigen_value_evaluation(mat_n,vec_n);
      S1+=sTemp;
      S2+=sTemp*sTemp;
    }
    E/=params->MCS;
    E2/=params->MCS;
    S1/=params->MCS;
    S2/=params->MCS;
    cudaMemcpy( ni, d_ni, 3*Nt*sizeof(float), cudaMemcpyDeviceToHost);
    sprintf(fname,"director_field_%d.csv",ii);
    print_n(fname,ni,*params,pt);
    fprintf(po_file,"%d %g %g %g %g\n",ii,S1, S2-S1*S1, E, (E2-E*E)); fflush(po_file);
  }
  fclose(po_file);
  gsl_rng_free (rng);
//~   for (int i=0; i<num_threads; i++) gsl_rng_free (rng[i]);
  return 0;
}