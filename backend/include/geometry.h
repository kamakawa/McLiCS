#ifndef GEOMETRY_H_
#define GEOMETRY_H_
#include <gsl/gsl_rng.h>

#include <iostream>
#include <vector>

#include "../include/define.h"
//~ #include "../include/evolve.h"
#include "../include/io.h"
#include "../include/monte_carlo.h"
#include "../include/parameter_order.h"
#include "../include/parameters.h"
#include "../include/potential.h"

class Geometry {
 public:
  explicit Geometry(Parameters *params);
  virtual ~Geometry() = default;

  int Nx, Ny, Nz;
  std::vector<class Anchoring *> surfaces;
  int nSurfaces;
  float newman_neighbours(const nni fullni[]);
  float second_nerghbours(const nni fullni[]);
  float third_nerghbours(const nni fullni[]);
  void Boundary_Init(Parameters *params);
  virtual int *set_point_type_normals(int *pt, Parameters *params) = 0;
  virtual float latice_Potential(const nni ni[7]) = 0;
  float (*bulk_potential)(float ni[3], float nj[3], Parameters *params, float rij[3], int nk);
  float *ns;
  Parameters *params;
  //~ ~Geometry(){};
};

class Bulk_Geometry : public Geometry {
 public:
  Bulk_Geometry(int *pt, Parameters *params);
  float latice_Potential(const nni ni[7]);

 private:
  int *set_point_type_normals(int *pt, Parameters *params);
};

class Slab_Geometry : public Geometry {
 public:
  Slab_Geometry(int *pt, Parameters *params);
  float latice_Potential(const nni ni[7]);

 private:
  int *set_point_type_normals(int *pt, Parameters *params);
};

class Sphere_Geometry : public Geometry {
 public:
  Sphere_Geometry(int *pt, Parameters *params);
  float latice_Potential(const nni ni[7]);

 private:
  int *set_point_type_normals(int *pt, Parameters *params);
};

class Custom_Geometry : public Geometry {
 public:
  Custom_Geometry(int *pt, Parameters *params);
  float latice_Potential(const nni ni[7]);

 private:
  //~     float *ns;
  int *set_point_type_normals(int *pt, Parameters *params);
};

#endif