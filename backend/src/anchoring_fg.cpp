#include <gsl/gsl_rng.h>
#include <math.h>
#include <string.h>

#include <iostream>
#include <map>
#include <vector>

#include "../include/anchoring.h"
#include "../include/parameters.h"
#include "../include/potential.h"
FG_Anchoring::FG_Anchoring(Parameters *params, int id) {
  this->id = id;
  // Asserting anchoring energy is set and getting its value:
  printf("seting surface %d: %s\n", id, name);
  this->params = params;

  try {
    W = params->W.at(id);
    std::cout << "W= " << W << ".\n";
  } catch (std::out_of_range dummy_var) {
    check_parameter(false, "W");
  }
  if (params->neighbourKind == 2) {
    W *= 4;
    std::cout << "W reescaled by 4 to " << W << " to acomodate the extra neighbours.\n";
  }
  if (params->neighbourKind == 3) {
    W *= 5;
    std::cout << "W reescaled by 4 to " << W << " to acomodate the extra neighbours.\n";
  }
  printf("\n");
}

float FG_Anchoring::surface_potential(float ni[3], float s[3]) {
  static float toPi = M_PI / 180;

  float nij = ni[0] * s[0] + ni[1] * s[1] + ni[2] * s[2];
  return +W * nij * nij;
}

FG_Anchoring_GHRL::FG_Anchoring_GHRL(Parameters *params, int id) {
  this->id = id;
  this->params = params;
  // Asserting anchoring energy is set and getting its value:
  printf("seting surface %d: %s\n", id, name);
  try {
    W = params->W.at(id);
    std::cout << "W= " << W << ".\n";
  } catch (std::out_of_range dummy_var) {
    check_parameter(false, "W");
  }
  if (params->neighbourKind == 2) {
    W *= 4;
    std::cout << "W reescaled by 4 to " << W << " to acomodate the extra neighbours.\n";
  }
  if (params->neighbourKind == 3) {
    W *= 6;
    std::cout << "W reescaled by 4 to " << W << " to acomodate the extra neighbours.\n";
  }
  printf("\n");
}

float FG_Anchoring_GHRL::surface_potential(float ni[3], float s[3]) {
  const float el = params->ghrl_lambda;
  const float em = params->ghrl_mu;
  const float en = params->ghrl_nu;
  const float er = params->ghrl_rho;
  const float es = params->ghrl_sigma;
  float v15 = 1.5;
  float v05 = 0.5;
  float mod = sqrtf(fabs(ni[0] * s[0] + ni[1] * s[1] + ni[2] * s[2]));
  float nj[3] = {ni[0] - s[0] * mod, ni[1] - s[1] * mod, ni[2] - s[2] * mod};
  mod = sqrtf(fabs(nj[0] * nj[0] + nj[1] * nj[1] + nj[2] * nj[2]));
  nj[0] /= (mod > 0 ? mod : 1);
  nj[1] /= (mod > 0 ? mod : 1);
  nj[2] /= (mod > 0 ? mod : 1);

  float ai = ni[0] * s[0] + ni[1] * s[1] + ni[2] * s[2];
  float aj = nj[0] * s[0] + nj[1] * s[1] + nj[2] * s[2];
  float nij = ni[0] * nj[0] + ni[1] * nj[1] + ni[2] * nj[2];
  float pij = v15 * nij * nij - v05;
  float cross = (ni[2] * nj[1] - ni[1] * nj[2]) * s[0] + (ni[0] * nj[2] - ni[2] * nj[0]) * s[1] + (ni[1] * nj[0] - ni[0] * nj[1]) * s[2];

  float E1 = ((v15 * ai * ai) + (v15 * aj * aj) - 1);
  //~ if (threadIdx.x==0)printf("%0.3f %0.3f %0.3f %0.3f %0.3f \n", ai, aj, cross, nij,(ai*aj*nij));
  return W * ((E1 * (er * pij + el) + em * (ai * aj * nij) - (1 / 9)) + en * pij + es * (nij > 0 ? 1 : -1) * cross);
}
