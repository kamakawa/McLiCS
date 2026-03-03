#ifndef MONTE_CARLO_H_
#define MONTE_CARLO_H_
#include <gsl/gsl_rng.h>

#include "../include/parameters.h"

void Monte_Carlo_Step_NBC(float *ni, float *bi, float *ci, float &ang_var, gsl_rng *r, Parameters params);
void Monte_Carlo_Step_N(float *ni, float &ang_var, gsl_rng *r, Parameters params);

#endif
