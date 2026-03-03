#include <gsl/gsl_rng.h>
#include <math.h>
#include <string.h>

#include <iostream>
#include <map>
#include <vector>

#include "../include/anchoring.h"
#include "../include/parameters.h"
#include "../include/potential.h"

RP_Anchoring::RP_Anchoring(Parameters *params, int id) {
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
  try {
    phi_s = params->phi_s.at(id);
    std::cout << "phi_s= " << phi_s << ".\n";
  } catch (std::out_of_range dummy_var) {
    check_parameter(false, "phi_s");
  }
  try {
    theta_s = params->theta_s.at(id);
    std::cout << "theta_s= " << theta_s << ".\n";
  } catch (std::out_of_range dummy_var) {
    check_parameter(false, "theta_s");
  }
  if (params->neighbourKind == 2) {
    W *= 4;
    std::cout << "W reescaled by 4 to " << W << " to acomodate the extra neighbours.\n";
  }
  printf("\n");
}

float RP_Anchoring::surface_potential(float ni[3], float s[3]) {
  static float toPi = M_PI / 180;
  static float n_s[3] = {cos(toPi * phi_s) * sin(toPi * theta_s),
                         sin(toPi * phi_s) * sin(toPi * theta_s),
                         cos(toPi * theta_s)};
  float nij = ni[0] * n_s[0] + ni[1] * n_s[1] + ni[2] * n_s[2];
  return -W * nij * nij;
}

RP_Anchoring_GHRL::RP_Anchoring_GHRL(Parameters *params, int id) {
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
  try {
    phi_s = params->phi_s.at(id);
    std::cout << "phi_s= " << phi_s << ".\n";
  } catch (std::out_of_range dummy_var) {
    check_parameter(false, "phi_s");
  }
  try {
    theta_s = params->theta_s.at(id);
    std::cout << "theta_s= " << theta_s << ".\n";
  } catch (std::out_of_range dummy_var) {
    check_parameter(false, "theta_s");
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

float RP_Anchoring_GHRL::surface_potential(float ni[3], float s[3]) {
  static float toPi = M_PI / 180;
  static float nj[3] = {cos(toPi * phi_s) * sin(toPi * theta_s),
                        sin(toPi * phi_s) * sin(toPi * theta_s),
                        cos(toPi * theta_s)};
  const float el = params->ghrl_lambda;
  const float em = params->ghrl_mu;
  const float en = params->ghrl_nu;
  const float er = params->ghrl_rho;
  const float es = params->ghrl_sigma;
  float v15 = 1.5;
  float v05 = 0.5;

  float ai = ni[0] * s[0] + ni[1] * s[1] + ni[2] * s[2];
  float aj = nj[0] * s[0] + nj[1] * s[1] + nj[2] * s[2];
  float nij = ni[0] * nj[0] + ni[1] * nj[1] + ni[2] * nj[2];
  float pij = v15 * nij * nij - v05;
  float cross = (ni[2] * nj[1] - ni[1] * nj[2]) * s[0] + (ni[0] * nj[2] - ni[2] * nj[0]) * s[1] + (ni[1] * nj[0] - ni[0] * nj[1]) * s[2];

  float E1 = ((v15 * ai * ai) + (v15 * aj * aj) - 1);
  //~ if (threadIdx.x==0)printf("%0.3f %0.3f %0.3f %0.3f %0.3f \n", ai, aj, cross, nij,(ai*aj*nij));
  return W * ((E1 * (er * pij + el) + em * (ai * aj * nij) - (1 / 9)) + en * pij + es * (nij > 0 ? 1 : -1) * cross);
}
