#include <gsl/gsl_rng.h>
#include <math.h>
#include <omp.h>

#include <iostream>

#include "../include/define.h"
#include "../include/evolve.h"
#include "../include/geometry.h"
#include "../include/io.h"
#include "../include/monte_carlo.h"
#include "../include/parameter_order.h"
#include "../include/parameters.h"
#include "../include/potential.h"

quenchEvolveN::quenchEvolveN(float *ni, int *ppt, Parameters *params)
    : Nx(params->Nx), Ny(params->Ny), Nz(params->Nz), EvolveN(ni, ppt, params) {
  printf("Initializing Step loop:\n");
  printf("Initial File Number= %d\n", params->first_file);
  printf("Last File Number= %d\n\n", params->first_file + params->fn);
  this->ni = ni;
  this->pt = ppt;
  this->params = params;
};

int quenchEvolveN::run() {
  float S1, S2, sTemp;
  float tempE, E2, E;
  float vec_nt[3];
  float vec_n[3];
  float mat_n[9];
  float ang_var = 0.5;
  char fname[1000];

  int num_threads = omp_get_max_threads();
  gsl_rng **rng = (gsl_rng **)calloc(num_threads, sizeof(gsl_rng *));
  gsl_rng_env_setup();
  for (int i = 0; i < num_threads; i++) {
    rng[i] = gsl_rng_alloc(gsl_rng_ranlxs0);
    gsl_rng_set(rng[i], i);
  }

  sprintf(fname, "po.dat");
  FILE *po_file = fopen(fname, "a");
  fprintf(po_file, "ii S varS E varE\n");
  fflush(po_file);
  params->T = params->Ti;
  printf("Step relaxation, for nematic molecules, using MCT=%d MCS=%d and fn=%d using %d threads\n",
         params->MCT, params->MCS, params->fn, num_threads);
  fflush(stdout);
  for (int ii = params->first_file; ii < params->fn + params->first_file; ii++) {
    params->T = params->Ti;
    for (int step = 0; step < params->MCT; step++) {
      Monte_Carlo_Step(ang_var, rng);
    }
    params->T = params->Tf;
    for (int step = 0; step < params->MCT*params->dT; step++) {
      Monte_Carlo_Step(ang_var, rng);
    }
    S1 = 0;
    S2 = 0;
    E = 0;
    E2 = 0;
    for (int step = 0; step < params->MCS; step++) {
      Monte_Carlo_Step(ang_var, rng);
      tempE = energy_calculator();
      E2 += tempE * tempE;
      E += tempE;
      Matrice_constructor(ni, mat_n, pt, *params);
      sTemp = Eigen_value_evaluation(mat_n, vec_n);
      S1 += sTemp;
      S2 += sTemp * sTemp;
    }
    E /= params->MCS;
    E2 /= params->MCS;
    S1 /= params->MCS;
    S2 /= params->MCS;
    sprintf(fname, "director_field_%d.csv", ii);
    print_n(fname, ni, *params, pt);
    fprintf(po_file, "%d %g %g %g %g\n", ii, S1, S2 - S1 * S1, E, (E2 - E * E));
    fflush(po_file);
  }

  for (int i = 0; i < num_threads; i++) gsl_rng_free(rng[i]);
  return 0;
}
