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

electricEvolveN::electricEvolveN(float *ni, int *ppt, Parameters *params)
    : Nx(params->Nx), Ny(params->Ny), Nz(params->Nz), EvolveN(ni, ppt, params) {
  this->ni = ni;
  this->pt = ppt;
  this->params = params;
  printf("Initializing electric loop:\n");
printf("Ei= %g\n",params->elecEi);
printf("Ef= %g\n",params->elecEf);
printf("dE= %g\n\n",params->elecdE);
};

int electricEvolveN::run() {
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
  int sign = -params->elecdE / fabs(params->elecdE);
  FILE *po_file = fopen(fname, "a");
  fprintf(po_file, "T S varS E varE\n");
  fflush(po_file);
  params->T = params->Ti;
  printf("Starting electric variation, for nematic molecules, from %g to %g with step os size %g\n", params->elecEi, params->elecEf, params->elecdE);
  printf("MCT=%d MCS=%d and %d threads\n",
         params->MCT, params->MCS, num_threads);
  fflush(stdout);
  
  for (params->elecE=params->elecEi; (int)1e6*sign*(params->elecE-params->elecEf)>=0; params->elecE+=params->elecdE){
    for (int step = 0; step < params->MCT; step++) {
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
    sprintf(fname, "director_field_%d.csv", (int)(100 * (params->elecE + 1e-7)));
    print_n(fname, ni, *params, pt);
    fprintf(po_file, "%g %g %g %g %g\n", params->elecE, S1, S2 - S1 * S1, E, (E2 - E * E));
    fflush(po_file);
  }

  for (int i = 0; i < num_threads; i++)
    gsl_rng_free(rng[i]);

  return 0;
}
