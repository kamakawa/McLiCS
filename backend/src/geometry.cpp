#include "../include/geometry.h"

#include <gsl/gsl_rng.h>
#include <math.h>
#include <string.h>

#include <iostream>
#include <map>
#include <string>
#include <vector>

#include "../include/anchoring.h"
#include "../include/parameters.h"
#include "../include/potential.h"

Geometry::Geometry(Parameters *params) : Nx(params->Nx), Ny(params->Ny), Nz(params->Nz) {
  this->params = params;
};
float Geometry::newman_neighbours(const nni fullni[]) {
  float rij[3];
  double E = 0;
  float ni[3] = {fullni[0].x, fullni[0].y, fullni[0].z};

  if (fullni[1].pt) {
    float nj[3] = {fullni[1].x, fullni[1].y, fullni[1].z};
    rij[0] = 1;
    rij[1] = 0;
    rij[2] = 0;
    E += bulk_potential(ni, nj, params, rij, 1);
  }

  if (fullni[2].pt) {
    float nj[3] = {fullni[2].x, fullni[2].y, fullni[2].z};
    rij[0] = -1;
    rij[1] = 0;
    rij[2] = 0;
    E += bulk_potential(ni, nj, params, rij, 1);
  }

  if (fullni[3].pt) {
    float nj[3] = {fullni[3].x, fullni[3].y, fullni[3].z};
    rij[0] = 0;
    rij[1] = 1;
    rij[2] = 0;
    E += bulk_potential(ni, nj, params, rij, 1);
  }

  if (fullni[4].pt) {
    float nj[3] = {fullni[4].x, fullni[4].y, fullni[4].z};
    rij[0] = 0;
    rij[1] = -1;
    rij[2] = 0;
    E += bulk_potential(ni, nj, params, rij, 1);
  }

  if (fullni[5].pt) {
    float nj[3] = {fullni[5].x, fullni[5].y, fullni[5].z};
    rij[0] = 0;
    rij[1] = 0;
    rij[2] = 1;
    E += bulk_potential(ni, nj, params, rij, 1);
  }

  if (fullni[6].pt) {
    float nj[3] = {fullni[6].x, fullni[6].y, fullni[6].z};
    rij[0] = 0;
    rij[1] = 0;
    rij[2] = -1;
    E += bulk_potential(ni, nj, params, rij, 1);
  }
  return E;
}
float Geometry::second_nerghbours(const nni fullni[]) {
  float rij[3];
  double E = 0;
  float ni[3] = {fullni[0].x, fullni[0].y, fullni[0].z};
  const float isqrt2 = 0.707106781;
  if (fullni[8].pt) {
    float nj[3] = {fullni[8].x, fullni[8].y, fullni[8].z};
    rij[0] = isqrt2;
    rij[1] = isqrt2;
    rij[2] = 0;
    E += bulk_potential(ni, nj, params, rij, 2);
  }
  if (fullni[9].pt) {
    float nj[3] = {fullni[9].x, fullni[9].y, fullni[9].z};
    rij[0] = isqrt2;
    rij[1] = -isqrt2;
    rij[2] = 0;
    E += bulk_potential(ni, nj, params, rij, 2);
  }
  if (fullni[10].pt) {
    float nj[3] = {fullni[10].x, fullni[10].y, fullni[10].z};
    rij[0] = isqrt2;
    rij[1] = 0;
    rij[2] = isqrt2;
    E += bulk_potential(ni, nj, params, rij, 2);
  }
  if (fullni[11].pt) {
    float nj[3] = {fullni[11].x, fullni[11].y, fullni[11].z};
    rij[0] = isqrt2;
    rij[1] = 0;
    rij[2] = -isqrt2;
    E += bulk_potential(ni, nj, params, rij, 2);
  }
  if (fullni[12].pt) {
    float nj[3] = {fullni[12].x, fullni[12].y, fullni[12].z};
    rij[0] = -isqrt2;
    rij[1] = isqrt2;
    rij[2] = 0;
    E += bulk_potential(ni, nj, params, rij, 2);
  }
  if (fullni[13].pt) {
    float nj[3] = {fullni[13].x, fullni[13].y, fullni[13].z};
    rij[0] = -isqrt2;
    rij[1] = -isqrt2;
    rij[2] = 0;
    E += bulk_potential(ni, nj, params, rij, 2);
  }
  if (fullni[14].pt) {
    float nj[3] = {fullni[14].x, fullni[14].y, fullni[14].z};
    rij[0] = -isqrt2;
    rij[1] = 0;
    rij[2] = isqrt2;
    E += bulk_potential(ni, nj, params, rij, 2);
  }
  if (fullni[15].pt) {
    float nj[3] = {fullni[15].x, fullni[15].y, fullni[15].z};
    rij[0] = -isqrt2;
    rij[1] = 0;
    rij[2] = -isqrt2;
    E += bulk_potential(ni, nj, params, rij, 2);
  }
  if (fullni[16].pt) {
    float nj[3] = {fullni[16].x, fullni[16].y, fullni[16].z};
    rij[0] = 0;
    rij[1] = isqrt2;
    rij[2] = isqrt2;
    E += bulk_potential(ni, nj, params, rij, 2);
  }
  if (fullni[17].pt) {
    float nj[3] = {fullni[17].x, fullni[17].y, fullni[17].z};
    rij[0] = 0;
    rij[1] = isqrt2;
    rij[2] = -isqrt2;
    E += bulk_potential(ni, nj, params, rij, 2);
  }
  if (fullni[18].pt) {
    float nj[3] = {fullni[18].x, fullni[18].y, fullni[18].z};
    rij[0] = 0;
    rij[1] = -isqrt2;
    rij[2] = isqrt2;
    E += bulk_potential(ni, nj, params, rij, 2);
  }
  if (fullni[19].pt) {
    float nj[3] = {fullni[19].x, fullni[19].y, fullni[19].z};
    rij[0] = 0;
    rij[1] = -isqrt2;
    rij[2] = -isqrt2;
    E += bulk_potential(ni, nj, params, rij, 2);
  }
  return E;
}
float Geometry::third_nerghbours(const nni fullni[]) {
  float rij[3];
  double E = 0;
  float ni[3] = {fullni[0].x, fullni[0].y, fullni[0].z};

  const float isqrt3 = 0.577350269;
  if (fullni[20].pt) {
    float nj[3] = {fullni[20].x, fullni[20].y, fullni[20].z};
    rij[0] = isqrt3;
    rij[1] = isqrt3;
    rij[2] = isqrt3;
    E += bulk_potential(ni, nj, params, rij, 3);
  }
  if (fullni[21].pt) {
    float nj[3] = {fullni[21].x, fullni[21].y, fullni[21].z};
    rij[0] = isqrt3;
    rij[1] = isqrt3;
    rij[2] = -isqrt3;
    E += bulk_potential(ni, nj, params, rij, 3);
  }
  if (fullni[22].pt) {
    float nj[3] = {fullni[22].x, fullni[22].y, fullni[22].z};
    rij[0] = isqrt3;
    rij[1] = -isqrt3;
    rij[2] = isqrt3;
    E += bulk_potential(ni, nj, params, rij, 3);
  }
  if (fullni[23].pt) {
    float nj[3] = {fullni[23].x, fullni[23].y, fullni[23].z};
    rij[0] = isqrt3;
    rij[1] = -isqrt3;
    rij[2] = -isqrt3;
    E += bulk_potential(ni, nj, params, rij, 3);
  }
  if (fullni[24].pt) {
    float nj[3] = {fullni[24].x, fullni[24].y, fullni[24].z};
    rij[0] = -isqrt3;
    rij[1] = isqrt3;
    rij[2] = isqrt3;
    E += bulk_potential(ni, nj, params, rij, 3);
  }
  if (fullni[25].pt) {
    float nj[3] = {fullni[25].x, fullni[25].y, fullni[25].z};
    rij[0] = -isqrt3;
    rij[1] = isqrt3;
    rij[2] = -isqrt3;
    E += bulk_potential(ni, nj, params, rij, 3);
  }
  if (fullni[26].pt) {
    float nj[3] = {fullni[26].x, fullni[26].y, fullni[26].z};
    rij[0] = -isqrt3;
    rij[1] = -isqrt3;
    rij[2] = isqrt3;
    E += bulk_potential(ni, nj, params, rij, 3);
  }
  if (fullni[27].pt) {
    float nj[3] = {fullni[27].x, fullni[27].y, fullni[27].z};
    rij[0] = -isqrt3;
    rij[1] = -isqrt3;
    rij[2] = -isqrt3;
    E += bulk_potential(ni, nj, params, rij, 3);
  }
  return E;
}

void Geometry::Boundary_Init(Parameters *params) {
  std::string anchoring;
  for (int ii = 0; ii < nSurfaces; ii++) {
    try {
      anchoring = params->anchoring_type.at(ii);
    } catch (std::out_of_range dummy_var) {
      std::cout << "You must define " << nSurfaces << " boundaries.\nPlease review your input file.\nAborting the program.\n\n";
      exit(0);
    }
    if (strcasecmp(anchoring.c_str(), "rp") == 0)
      surfaces.at(ii) = new RP_Anchoring(params, ii);
    else if (strcasecmp(anchoring.c_str(), "fg") == 0)
      surfaces.at(ii) = new FG_Anchoring(params, ii);
    else if (strcasecmp(anchoring.c_str(), "homeotropic") == 0)
      surfaces.at(ii) = new Homeotropic_Anchoring(params, ii);
    else if (strcasecmp(anchoring.c_str(), "strong") == 0)
      surfaces.at(ii) = new Strong_Anchoring(params, ii);
    else if (strcasecmp(anchoring.c_str(), "rp_ghrl") == 0)
      surfaces.at(ii) = new RP_Anchoring_GHRL(params, ii);
    else if (strcasecmp(anchoring.c_str(), "fg_ghrl") == 0)
      surfaces.at(ii) = new FG_Anchoring_GHRL(params, ii);
    else if (strcasecmp(anchoring.c_str(), "homeotropic_ghrl") == 0)
      surfaces.at(ii) = new Homeotropic_Anchoring_GHRL(params, ii);
    else if (strcasecmp(anchoring.c_str(), "strong_ghrl") == 0)
      surfaces.at(ii) = new Strong_Anchoring_GHRL(params, ii);
    else {
      printf("%s boundary condition is not defined\n", anchoring.c_str());
      exit(2);
    }
  }
};
