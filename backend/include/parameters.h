#ifndef PARAMETERS_H_
#define PARAMETERS_H_
#include <gsl/gsl_rng.h>

#include <map>
#include <string>

enum parameter_status { set,
                        unset };

struct Parameters {
  //lattice Variables
  char geometry[20] = "bulk";
  int Nx = 16;
  int Ny = 16;
  int Nz = 16;
  char XBoundtype[20] = "free";
  char YBoundtype[20] = "free";
  char ZBoundtype[20] = "free";
  int (*XBound)(int&, int);
  int (*YBound)(int&, int);
  int (*ZBound)(int&, int);

  //Surface Variables
  char bound_file_name[100];
  std::map<int, float> theta_s;
  std::map<int, float> phi_s;
  std::map<int, float> W;
  std::map<int, std::string> anchoring_type;

  //potential Variables
  char potential[20] = "ll";
  float A = 1.0;
  float B1 = 0.04;
  float B2 = 0.4;
  float C = 0.3;
  float Ti = 1.2;
  float Tf = 0.0;
  float dT = -0.02;
  float T;
  float ghrl_rho = 0;
  float ghrl_lambda = 0;
  float ghrl_mu = 0;
  float ghrl_nu = 1;
  float ghrl_sigma = 0;

  //MC Variables
  char evol[20] = "thermal";
  int MCS = 1e2;
  int MCT = 1e2;
  int fn = 1;
  int first_file = 0;

  //IC variables
  char ic[50] = "random";
  char ic_file[100];
  float phi_0 = 0;
  float theta_0 = 0;
  float p0_i = 0;
  float k11 = 1;
  float k22 = 1;
  float k33 = 1;
  float p0 = 0;

  //NeighbourHood
  int neighbourKind = 1;
  float rhoScale = 1.0;
  float lambdaScale = 1.0;
  float muScale = 1.0;
  float nuScale = 1.0;
  float sigmaScale = 1.0;
  float neighbourScale = 1.0;

  //Electric Field Variables
  float elecX  = 0;
  float elecY  = 0;
  float elecZ  = 0;
  float elecA  = 0;  
  float elecEi = 0;  
  float elecEf = 0;
  float elecdE = 0;
  float elecE  = 1;

};

#endif
