#include "../include/ic.h"

#include <gsl/gsl_randist.h>
#include <gsl/gsl_rng.h>
#include <math.h>
#include <string.h>

#include "../include/define.h"
#include "../include/monte_carlo.h"
#include "../include/parameters.h"

void apply_Initial_Condidions(float *ni, int *pt, Parameters params) {
  if (strcasecmp(params.ic, "random") == 0) {
    random_ic(ni, pt, params);
  } else if (strcasecmp(params.ic, "homogeneous") == 0) {
    homogeneous_ic(ni, pt, params);
  } else if (strcasecmp(params.ic, "ic_file") == 0) {
    read_ic_file(ni, pt, params);
  } else if (strcasecmp(params.ic, "cholesteric") == 0) {
    cholesteric_ic(ni, pt, params);
  } else {
    fprintf(stderr, "initial condition %s not implemented \n", params.ic);
    exit(2);
  }
}

void random_ic(float *ni, int *pt, Parameters params) {
  int Nx = params.Nx;
  int Ny = params.Ny;
  int Nz = params.Nz;
  double nx, ny, nz;
  gsl_rng *rng;
  gsl_rng_env_setup();
  rng = gsl_rng_alloc(gsl_rng_taus);
  gsl_rng_set(rng, 1);
  printf("Random initial conditions\n\n");
  for (int i = 0; i < params.Nx; i++) {
    for (int j = 0; j < params.Ny; j++) {
      for (int k = 0; k < params.Nz; k++) {
        if (pti(i, j, k)) {
          //~ float theta=gsl_rng_uniform(rng);
          //~ float phi=gsl_rng_uniform(rng);
          //~ nix(i,j,k)=sin(phi*M_PI)*cos(2*theta*M_PI);
          //~ niy(i,j,k)=sin(phi*M_PI)*sin(2*theta*M_PI);
          //~ niz(i,j,k)=cos(phi*M_PI);
          gsl_ran_dir_3d(rng, &nx, &ny, &nz);
          nix(i, j, k) = nx;
          niy(i, j, k) = ny;
          niz(i, j, k) = nz;
        } else {
          nix(i, j, k) = 0;
          niy(i, j, k) = 0;
          niz(i, j, k) = 1;
        }
      }
    }
  }
  gsl_rng_free(rng);
}

void homogeneous_ic(float *ni, int *pt, Parameters params) {
  int Nx = params.Nx;
  int Ny = params.Ny;
  int Nz = params.Nz;

  float theta = params.theta_0;
  float phi = params.phi_0;
  printf("homogeneous initial conditions\n\n");
  printf("phi0:   %g\n", phi);
  printf("theta0: %g\n", theta);
  for (int i = 0; i < Nx; i++) {
    for (int j = 0; j < Ny; j++) {
      for (int k = 0; k < Nz; k++) {
        if (pti(i, j, k)) {
          nix(i, j, k) = sin(theta * M_PI / 180) * cos(phi * M_PI / 180);
          niy(i, j, k) = sin(theta * M_PI / 180) * sin(phi * M_PI / 180);
          niz(i, j, k) = cos(theta * M_PI / 180);
        } else {
          nix(i, j, k) = 0;
          niy(i, j, k) = 0;
          niz(i, j, k) = 1;
        }
      }
    }
  }
}

void read_ic_file(float *ni, int *pt, Parameters params) {
  int Nx = params.Nx;
  int Ny = params.Ny;
  int Nz = params.Nz;
  FILE *input_file = fopen(params.ic_file, "r");
  char *garbage = (char *)malloc(500);
  if (input_file == 0) {
    perror(params.ic_file);
    exit(2);
  }
  int x, y, z;
  float nx, ny, nz, bx, by, bz, cx, cy, cz;
  int line = 1;
  x = fscanf(input_file, "x,y,z,nx,ny,nz");
  garbage = fgets(garbage, 500, input_file);
  printf("Reading initial conditions from %s\n", params.ic_file);
  fflush(stdout);
  for (int i = 0; i < Nx * Ny * Nz; i++) {
    if (fscanf(input_file, "%d,%d,%d,%f,%f,%f", &x, &y, &z, &nx, &ny, &nz) != 6) {
      fprintf(stderr, "%d,%d,%d,%f,%f,%f\n", x, y, z, nx, ny, nz);
      fprintf(stderr, "Problem in the line %d!\nAbborting!!!\n", ++line);
      exit(3);
    } else {
      nix(x, y, z) = nx;
      niy(x, y, z) = ny;
      niz(x, y, z) = nz;
      garbage = fgets(garbage, 500, input_file);
      line++;
    }
  }
  fclose(input_file);
}

void cholesteric_ic(float *ni, int *pt, Parameters params) {
  int Nx = params.Nx;
  int Ny = params.Ny;
  int Nz = params.Nz;

  float theta = params.theta_0;
  float phi_0 = params.phi_0 * M_PI / 180;
  float p0 = params.p0_i ? params.p0_i : params.p0;
  float phi;
  printf("Cholesteric initial conditions\n\n");
  printf("p0:     %g\n", p0);
  printf("phi0:   %g\n", phi_0);
  printf("theta0: %g\n", theta);
  for (int i = 0; i < Nx; i++) {
    for (int j = 0; j < Ny; j++) {
      for (int k = 0; k < Nz; k++) {
        if (pti(i, j, k)) {
          phi = phi_0 - 2 * M_PI * k / p0;

          nix(i, j, k) = sin(theta * M_PI / 180) * cos(phi);
          niy(i, j, k) = sin(theta * M_PI / 180) * sin(phi);
          niz(i, j, k) = cos(theta * M_PI / 180);
        } else {
          nix(i, j, k) = 0;
          niy(i, j, k) = 0;
          niz(i, j, k) = 1;
        }
      }
    }
  }
}
