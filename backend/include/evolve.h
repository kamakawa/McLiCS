#ifndef EVOL_H_
#define EVOL_H_
#include <iostream>

#include "../include/define.h"
#include "../include/geometry.h"
#include "../include/parameters.h"
#include "../include/potential.h"
#ifdef CUDA__
// #pragma message ( "Cuda Compilation" )
#include <cuda_runtime.h>
#include <curand_kernel.h>
#else
// #pragma message ( "CPU Compilation" )
struct dim3 {
  unsigned int x;
  unsigned int y;
  unsigned int z;
};
#endif

class Evolve {
 public:
  virtual ~Evolve() = default;

  virtual int run() { return 0; };
  virtual float latice_Potential() { return 0; };
  unsigned int Nx, Ny, Nz;
  Geometry *geometry;
  int VallidPoints;

  void check_Points(int *pt, Parameters params);
  virtual void tester() {
    printf("here\n");
    fflush(stdout);
  }
};

class EvolveN : public Evolve {
 public:
  ~EvolveN() override = default;

  EvolveN(float *ni, int *pt, Parameters *params) : ni(ni), pt(pt), params(params), Nx(params->Nx), Ny(params->Ny), Nz(params->Nz){};
  virtual int run() { return 0; };
  void Monte_Carlo_Step(float &ang_var, gsl_rng **r);
  float energy_calculator_GPU();
  float energy_calculator();
  void Monte_Carlo_Step_GPU(float &ang_var, gsl_rng *r);

 protected:
  dim3 tick;
#ifdef CUDA__
  curandState *d_rngStates = 0;
#endif
  int *d_pt = 0;
  float *d_T;
  unsigned int *d_acc = 0;
  Parameters *d_params = 0;
  int Nx, Ny, Nz;
  float *ni, *d_ni;
  int *pt;
  Parameters *params;
};

class thermalEvolveN : public EvolveN {
 public:
  thermalEvolveN(float *ni, int *pt, Parameters *params);
  int run();
  ~thermalEvolveN() override = default;
  int Nx, Ny, Nz;
  float *ni;
  int *pt;
};

class stepEvolveN : public EvolveN {
 public:
  stepEvolveN(float *ni, int *pt, Parameters *params);
  int run();
  ~stepEvolveN() override = default;
  int Nx, Ny, Nz;
  float *ni;
  int *pt;
};

class quenchEvolveN : public EvolveN {
 public:
  quenchEvolveN(float *ni, int *pt, Parameters *params);
  int run();
  ~quenchEvolveN() override = default;
  int Nx, Ny, Nz;
  float *ni;
  int *pt;
};
class electricEvolveN : public EvolveN {
 public:
  electricEvolveN(float *ni, int *pt, Parameters *params);
  int run();
  ~electricEvolveN() override = default;
  int Nx, Ny, Nz;
  float *ni;
  int *pt;
};

#endif