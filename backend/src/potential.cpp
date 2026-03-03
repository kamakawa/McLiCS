#include "../include/potential.h"

#include <math.h>

#include <iostream>

#include "../include/define.h"
#include "../include/parameters.h"

float Bulk_Energy_Selinger_Pear(float ni[3], float nj[3], Parameters *params, float rij[3], int nk) {
  float nij, polar_splay;
  nij = ni[0] * nj[0] + ni[1] * nj[1] + ni[2] * nj[2];
  polar_splay = +(1 + 2 * nij + nij * nij) * ((nj[0] - ni[0]) * rij[0] + (nj[1] - ni[1]) * rij[1] + (nj[2] - ni[2]) * rij[2]);
  return (-params->A * nij * nij - params->B1 * nij - (params->C * 0.25) * polar_splay);
}

float Bulk_Energy_Lebwohl_Lasher(float ni[3], float nj[3], Parameters *params, float rij[3], int nk) {
  float nij = ni[0] * nj[0] + ni[1] * nj[1] + ni[2] * nj[2];
  return -params->A * 1.5 * nij * nij;
}

float Bulk_Energy_GHRL(float ni[3], float nj[3], Parameters *params, float rij[3], int nk) {
  const float el = ( nk==2 ? params->lambdaScale: 1)*params->ghrl_lambda;
  const float em = ( nk==2 ? params->muScale    : 1)*params->ghrl_mu;
  const float en = ( nk==2 ? params->nuScale    : 1)*params->ghrl_nu;
  const float er = ( nk==2 ? params->rhoScale   : 1)*params->ghrl_rho;
  const float es = ( nk==2 ? params->sigmaScale : 1)*params->ghrl_sigma;//((nk - 1) * params->neighbourScale + 2) / (2 * sqrt(nk)) * params->ghrl_sigma;
  float ai = ni[0] * rij[0] + ni[1] * rij[1] + ni[2] * rij[2];
  float aj = nj[0] * rij[0] + nj[1] * rij[1] + nj[2] * rij[2];
  float nij = ni[0] * nj[0] + ni[1] * nj[1] + ni[2] * nj[2];
  float pij = ((float)1.5) * nij * nij - ((float)0.5);
  float cross = (ni[2] * nj[1] - ni[1] * nj[2]) * rij[0] 
              + (ni[0] * nj[2] - ni[2] * nj[0]) * rij[1] 
              + (ni[1] * nj[0] - ni[0] * nj[1]) * rij[2];

  float E1 = ((1.5 * ai * ai) + (1.5 * aj * aj) - 1);
  return ((E1 * (er * pij + el) + em * (ai * aj * nij - 1.0 / 9)) + en * pij + es * (nij > 0 ? 1 : -1) * cross);
}
float Electric_Potential(float ni[3], Parameters *params){
  float nDotE = params->elecE*(ni[0]*params->elecX+ni[1]*params->elecY+ni[2]*params->elecZ);

  return -params->elecA*( nDotE*nDotE );
}
int Periodic_Boundary(int &ii, int NN) {
  ii = ((ii + NN) % NN);
  return 1;
}

int Free_Boundary(int &ii, int NN) {
  if (ii == -1 || ii == NN)
    return 0;
  else
    return 1;
}
