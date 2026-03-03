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

thermalEvolveNGPU::thermalEvolveNGPU(float *ni, int *ppt, Parameters *params)
:Nx(params->Nx),Ny(params->Ny),Nz(params->Nz),EvolveNGPU(ni,ppt,params){
this->ni=ni;
this->pt=ppt;
this->params=params;
printf("Initializing thermal loop:\n");
printf("Ti= %g\n",params->Ti);
printf("Tf= %g\n",params->Tf);
printf("dT= %g\n\n",params->dT);
d_params=EvolveNGPU::d_params;

}; 

int thermalEvolveNGPU::run(){
  //~ for (int ii=0; ii<geometry->nSurfaces; ii++) surfaces[ii]=geometry->surfaces[ii];
  float Nt=Nx*Ny*Nz;
  float S1, S2;
  //~ float P1,V1,B1,C1, BCB, CBC;
  float sTemp;
  //~ float vec_nt[3];
  float vec_n[3] ;
  float mat_n[9] ;
  float ang_var=0.5;
  char fname[1000];
  float tempE, E2, E;
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
  cudaMalloc((void **)&d_acc, Nt *sizeof(unsigned int));  
  
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

  // Host RNG (kept for API compatibility; GPU uses curand)
  gsl_rng_env_setup();
  gsl_rng * rng = gsl_rng_alloc(gsl_rng_default);
  gsl_rng_set(rng, (unsigned long)time(nullptr));
  
  sprintf(fname,"po.dat");
  int sign=-params->dT/fabs(params->dT);
  FILE *po_file=fopen(fname,"a");
  fprintf(po_file,"T S varS E varE\n"); fflush(po_file);
  printf("Starting thermal variation, for nematic molecules, from %g to %g with step os size %g\n", params->Ti, params->Tf, params->dT);
  printf("MCT=%d MCS=%d\n",
  params->MCT,params->MCS); fflush(stdout);
  for (params->T=params->Ti; (int)1e6*sign*(params->T-params->Tf)>=0; params->T+=params->dT){
    cudaMemcpy(d_T, &params->T, sizeof(float), cudaMemcpyHostToDevice);
    for(int step=0; step<params->MCT; step++){
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
    cudaMemcpy( ni, d_ni, 3*Nt*sizeof(float), cudaMemcpyDeviceToHost);
    S1/=params->MCS;
    S2/=params->MCS;
    sprintf(fname,"director_field_%d.csv",(int)(100*(params->T+1e-5)));
    print_n(fname,ni,*params,pt);
    fprintf(po_file,"%g %g %g %g %g\n",params->T,S1, S2-S1*S1, E, (E2-E*E)); fflush(po_file);
  }
  
  fclose(po_file);
  gsl_rng_free (rng);
    
  return 0;
}