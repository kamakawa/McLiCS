#include <gsl/gsl_rng.h>
#include <string.h>

#include <iostream>

#include "../include/define.h"
#include "../include/evolve.cuh"
#include "../include/evolve.h"
#include "../include/ic.h"
#include "../include/io.h"
#include "../include/monte_carlo.h"
#include "../include/parameter_order.h"
#include "../include/parameters.h"
#include "../include/potential.h"
#include "../include/simulator.h"

simulator::simulator(Parameters *params) : Nx(params->Nx), Ny(params->Ny), Nz(params->Nz) {
  this->params = params;
  // garantir estado conhecido
  ni = nullptr;
  pt = nullptr;
  evolve = nullptr;
}

simulator::~simulator() {
  // liberar recursos
  delete evolve;
  evolve = nullptr;

  if (ni) {
    free(ni);
    ni = nullptr;
  }
  if (pt) {
    free(pt);
    pt = nullptr;
  }
}

void simulator::Setup_simmulation(Parameters &params) {
  // Se for chamado mais de uma vez, evita vazamento
  delete evolve;
  evolve = nullptr;

  if (ni) { free(ni); ni = nullptr; }
  if (pt) { free(pt); pt = nullptr; }

  const int Np = params.Nx * params.Ny * params.Nz;  // número de sítios
  const int Nn = 3 * Np;                              // 3 componentes por sítio

  ni = (float *)calloc(Nn, sizeof(float));
  pt = (int *)calloc(Np, sizeof(int));               // ✅ CORRETO: pt tem Np, não Nn

  if (!ni || !pt) {
    fprintf(stderr, "Out of memory allocating ni/pt\n");
    exit(2);
  }

  // -------------------------------------------------------------------
  // Seleção do Evolve (GPU build): "thermal/step/quench/electric" => GPU por padrão
  // Também aceita explicitamente "thermalGPU/stepGPU/..." para compatibilidade.
  // -------------------------------------------------------------------
  if (strcasecmp(params.evol, "thermal") == 0 || strcasecmp(params.evol, "thermalGPU") == 0) {
    evolve = new thermalEvolveNGPU(ni, pt, &params);
    printf("[CUDA] Using thermal evolution on GPU\n");
  } else if (strcasecmp(params.evol, "step") == 0 || strcasecmp(params.evol, "stepGPU") == 0) {
    evolve = new stepEvolveNGPU(ni, pt, &params);
    printf("[CUDA] Using step evolution on GPU\n");
  } else if (strcasecmp(params.evol, "quench") == 0 || strcasecmp(params.evol, "quenchGPU") == 0) {
    evolve = new quenchEvolveNGPU(ni, pt, &params);
    printf("[CUDA] Using quench evolution on GPU\n");
  } else if (strcasecmp(params.evol, "electric") == 0 || strcasecmp(params.evol, "electricGPU") == 0) {
    evolve = new electricEvolveNGPU(ni, pt, &params);
    printf("[CUDA] Using electric evolution on GPU\n");
  } else {
    printf("Evolve %s not defined, try thermal/step/quench/electric\n", params.evol);
    exit(2);
  }

  if (strcasecmp(params.geometry, "bulk") == 0) {
    evolve->geometry = new Bulk_Geometry(pt, &params);
  } else if (strcasecmp(params.geometry, "slab") == 0) {
    evolve->geometry = new Slab_Geometry(pt, &params);
  } else if (strcasecmp(params.geometry, "sphere") == 0) {
    evolve->geometry = new Sphere_Geometry(pt, &params);
  } else if (strcasecmp(params.geometry, "custom") == 0) {
    evolve->geometry = new Custom_Geometry(pt, &params);
  } else {
    fprintf(stderr, "Geometry %s not defined\n", params.geometry);
    exit(2);
  }

  if (strcasecmp(params.XBoundtype, "free") == 0)
    params.XBound = &Free_Boundary;
  else if (strcasecmp(params.XBoundtype, "periodic") == 0)
    params.XBound = &Periodic_Boundary;
  else {
    fprintf(stderr, "X boundary condition: %s not implemented \n", params.XBoundtype);
    exit(2);
  }

  if (strcasecmp(params.YBoundtype, "free") == 0)
    params.YBound = &Free_Boundary;
  else if (strcasecmp(params.YBoundtype, "periodic") == 0)
    params.YBound = &Periodic_Boundary;
  else {
    fprintf(stderr, "Y boundary condition: %s not implemented \n", params.YBoundtype);
    exit(2);
  }

  if (strcasecmp(params.ZBoundtype, "free") == 0)
    params.ZBound = &Free_Boundary;
  else if (strcasecmp(params.ZBoundtype, "periodic") == 0)
    params.ZBound = &Periodic_Boundary;
  else {
    fprintf(stderr, "Z boundary condition: %s not implemented \n", params.ZBoundtype);
    exit(2);
  }

  evolve->geometry->Boundary_Init(&params);
  evolve->check_Points(pt, params);
  apply_Initial_Condidions(ni, pt, params);

  if (strcasecmp(params.potential, "ll") * strcasecmp(params.potential, "lebwohl-lahser") == 0) {
    evolve->geometry->bulk_potential = &Bulk_Energy_Lebwohl_Lasher;
    printf("Using lebwohl-lasher potential\n");
  } else if (strcasecmp(params.potential, "ghrl") * strcasecmp(params.potential, "grun-hess") == 0) {
    evolve->geometry->bulk_potential = &Bulk_Energy_GHRL;
    setGHRL(params);
    printf("Using gruhn-hess potential\n");
  } else if (strcasecmp(params.potential, "pear") == 0) {
    evolve->geometry->bulk_potential = &Bulk_Energy_Selinger_Pear;
    printf("Using splay-bend potential\n");
  } else {
    printf("%s potential not programed.\n Try lebwohl-lasher(LL), pear, BC or gruhn-hess(GHRL)", params.potential);
    exit(2);
  }
}

int simulator::print_n(const char *fname, const Parameters *params) const {
  FILE *output = fopen(fname, "w");
  if (output == 0) {
    perror(fname);
    return 1;
  }
  fprintf(output, "x,y,z,nx,ny,nz,s,pt\n");

  for (int k = 0; k < params->Nz; k++) {
    for (int j = 0; j < params->Ny; j++) {
      for (int i = 0; i < params->Nx; i++) {
        fprintf(output, "%d,%d,%d,%g,%g,%g,1,%d\n", i, j, k,
                nix(i, j, k), niy(i, j, k), niz(i, j, k), pti(i, j, k));
      }
    }
  }
  printf("Snapshot saved in %s\n", fname);
  fflush(stdout);
  fclose(output);
  return 0;
}