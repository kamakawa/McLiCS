#include <gsl/gsl_rng.h>
#include <math.h>
#include <string.h>

#include <iostream>
#include <map>
#include <vector>

#include "../include/anchoring.h"
#include "../include/parameters.h"
#include "../include/potential.h"

Strong_Anchoring::Strong_Anchoring(Parameters *params, int id) {
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
  printf("\n");
}

float Strong_Anchoring::surface_potential(float ni[3], float s[3]) {
  static float toPi = M_PI / 180;
  static float n_s[3] = {cos(toPi * phi_s) * sin(toPi * theta_s),
                         sin(toPi * phi_s) * sin(toPi * theta_s),
                         cos(toPi * theta_s)};
  float nij = ni[0] * n_s[0] + ni[1] * n_s[1] + ni[2] * n_s[2];
  return -W * nij * nij;
}

Strong_Anchoring_GHRL::Strong_Anchoring_GHRL(Parameters *params, int id) {
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
  printf("\n");
}

float Strong_Anchoring_GHRL::surface_potential(float ni[3], float s[3]) {
  static float toPi = M_PI / 180;
  static float n_s[3] = {cos(toPi * phi_s) * sin(toPi * theta_s),
                         sin(toPi * phi_s) * sin(toPi * theta_s),
                         cos(toPi * theta_s)};
  float nij = ni[0] * n_s[0] + ni[1] * n_s[1] + ni[2] * n_s[2];
  return -W * nij * nij;
}
