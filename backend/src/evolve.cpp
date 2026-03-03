#include "../include/evolve.h"

#include <gsl/gsl_randist.h>
#include <gsl/gsl_rng.h>
#include <math.h>
#include <omp.h>

#include <iostream>

#include "../include/define.h"
#include "../include/geometry.h"
#include "../include/io.h"
#include "../include/monte_carlo.h"
#include "../include/parameter_order.h"
#include "../include/parameters.h"
#include "../include/potential.h"
void inline setNni(uint pos, int conditional, nni *nLocal, float *ni, int *pt) {
  if (conditional == 1) {
    nLocal->x = ni[pos * 3 + 0];
    nLocal->y = ni[pos * 3 + 1];
    nLocal->z = ni[pos * 3 + 2];
    nLocal->pt = pt[pos];
  } else {
    nLocal->pt = 0;
  }
}
float EvolveN::energy_calculator() {
  static const int Nt = params->Nx * params->Ny * params->Nz;
  static int valid = 0;
  static bool setUp;
  if (setUp) {
    for (int ii = 0; ii < Nt; ii++) {
      if (pt[ii])
        valid++;
    }
  }

  double Etot = 0;
#pragma omp parallel for simd reduction(+ : Etot) schedule(simd : dynamic) num_threads(omp_get_max_threads())
  for (int idx = 0; idx < Nt; idx++) {
    nni nLocal[28];

    int i = idx % Nx;
    int j = (idx / Nx) % Ny;
    int k = idx / (Nx * Ny);
    if (i >= Nx || i<0) {
      printf("Tem cachorro nesse mato (%d %d %d )\n", i, j, k);
      fflush(stdout);
      exit(1);
    }
    if (j >= Ny|| j<0) {
      printf("Tem cachorro nesse mato (%d %d %d )\n", i, j, k);
      fflush(stdout);
      exit(1);
    }
    if (k >= Nz|| k<0) {
      printf("Tem cachorro nesse mato (%d %d %d )\n", i, j, k);
      fflush(stdout);
      exit(1);
    }

    int im = (i - 1), ip = (i + 1);
    int jm = (j - 1), jp = (j + 1);
    int km = (k - 1), kp = (k + 1);
    int neighbour[6] = {
        params->XBound(ip, Nx), params->XBound(im, Nx),
        params->YBound(jp, Ny), params->YBound(jm, Ny),
        params->ZBound(kp, Nz), params->ZBound(km, Nz)};
    setNni(i + Nx * (j + Ny * k ), 1, &nLocal[0], ni, pt);
    setNni(ip+ Nx * (j + Ny * k ), neighbour[0], &nLocal[1], ni, pt);
    setNni(im+ Nx * (j + Ny * k ), neighbour[1], &nLocal[2], ni, pt);
    setNni(i + Nx * (jp+ Ny * k ), neighbour[2], &nLocal[3], ni, pt);
    setNni(i + Nx * (jm+ Ny * k ), neighbour[3], &nLocal[4], ni, pt);
    setNni(i + Nx * (j + Ny * kp), neighbour[4], &nLocal[5], ni, pt);
    setNni(i + Nx * (j + Ny * km), neighbour[5], &nLocal[6], ni, pt);
    if (nLocal[0].pt > 1) {
      nLocal[7].x = geometry->ns[(i + Nx * (j + Ny * k)) * 3 + 0];
      nLocal[7].y = geometry->ns[(i + Nx * (j + Ny * k)) * 3 + 1];
      nLocal[7].z = geometry->ns[(i + Nx * (j + Ny * k)) * 3 + 2];
      nLocal[7].pt = 1;
      //~ printf("%g %g %g %d\n",nLocal[7].x,nLocal[7].y,nLocal[7].z,nLocal[7].pt );
    }
    if (params->neighbourKind > 1) {
      setNni(ip+ Nx * (jp+ Ny * k ), neighbour[0] * neighbour[2], &nLocal[ 8], ni, pt);
      setNni(ip+ Nx * (jm+ Ny * k ), neighbour[0] * neighbour[3], &nLocal[ 9], ni, pt);
      setNni(ip+ Nx * (j + Ny * kp), neighbour[0] * neighbour[4], &nLocal[10], ni, pt);
      setNni(ip+ Nx * (j + Ny * km), neighbour[0] * neighbour[5], &nLocal[11], ni, pt);
      setNni(im+ Nx * (jp+ Ny * k ), neighbour[1] * neighbour[2], &nLocal[12], ni, pt);
      setNni(im+ Nx * (jm+ Ny * k ), neighbour[1] * neighbour[3], &nLocal[13], ni, pt);
      setNni(im+ Nx * (j + Ny * kp), neighbour[1] * neighbour[4], &nLocal[14], ni, pt);
      setNni(im+ Nx * (j + Ny * km), neighbour[1] * neighbour[5], &nLocal[15], ni, pt);
      setNni(i + Nx * (jp+ Ny * kp), neighbour[2] * neighbour[4], &nLocal[16], ni, pt);
      setNni(i + Nx * (jp+ Ny * km), neighbour[2] * neighbour[5], &nLocal[17], ni, pt);
      setNni(i + Nx * (jm+ Ny * kp), neighbour[3] * neighbour[4], &nLocal[18], ni, pt);
      setNni(i + Nx * (jm+ Ny * km), neighbour[3] * neighbour[5], &nLocal[19], ni, pt);
    }
    if (params->neighbourKind == 3) {
      setNni(ip + Nx * (jp + Ny * kp), neighbour[0] * neighbour[2] * neighbour[4], &nLocal[20], ni, pt);
      setNni(ip + Nx * (jp + Ny * km), neighbour[0] * neighbour[2] * neighbour[5], &nLocal[21], ni, pt);
      setNni(ip + Nx * (jm + Ny * kp), neighbour[0] * neighbour[3] * neighbour[4], &nLocal[22], ni, pt);
      setNni(ip + Nx * (jm + Ny * km), neighbour[0] * neighbour[3] * neighbour[5], &nLocal[23], ni, pt);
      setNni(im + Nx * (jp + Ny * kp), neighbour[1] * neighbour[2] * neighbour[4], &nLocal[24], ni, pt);
      setNni(im + Nx * (jp + Ny * km), neighbour[1] * neighbour[2] * neighbour[5], &nLocal[25], ni, pt);
      setNni(im + Nx * (jm + Ny * kp), neighbour[1] * neighbour[3] * neighbour[4], &nLocal[26], ni, pt);
      setNni(im + Nx * (jm + Ny * km), neighbour[1] * neighbour[3] * neighbour[5], &nLocal[27], ni, pt);
    }
    Etot += geometry->latice_Potential(nLocal);
  }
  return Etot / Nt;
}

void EvolveN::Monte_Carlo_Step(float &ang_var, gsl_rng **r) {
  float T = params->T;
  static int Nt = params->Nx * params->Ny * params->Nz;
  static int vallid = 0;
  static float *myNi = (float *)calloc(Nt * 3, sizeof(float));
  int acceptance;
  int idx;
  static int time = 0;
  acceptance = 0;
  int iBoxSize = 2;
  int jBoxSize = 2;
  int kBoxSize = 2;
  int Ni = Nx / 2 + Nx % 2;
  int Nj = Ny / 2 + Ny % 2;
  int Nk = Nz / 2 + Nz % 2;
  int Ntt = Ni * Nj * Nk;
  static bool setUp = true;
  if (setUp) {
    for (int ii = 0; ii < Nt; ii++)
      if (pt[ii])
        vallid++;
    setUp = false;
  }
  for (int i = 0; i < Nt * 3; i++)
    myNi[i] = ni[i];
#pragma omp parallel num_threads(omp_get_max_threads())
  for (int tick = 0; tick < 8; tick++) {
#pragma omp for simd reduction(+ : acceptance) schedule(simd : dynamic)
    for (int nt = 0; nt < Ntt; nt++) {
      float E_new, E_old, rotation_type, va, ranVal;
      int i, j, k;
      float nNew[3];
      int thread = omp_get_thread_num();
      int iBox = nt % Ni;
      int jBox = (nt / Ni) % Nj;
      int kBox = nt / Ni / Nj;
      int di = tick % 2;
      int dj = (tick / 2) % 2;
      int dk = tick / 4;
      const static int nti = params->neighbourKind == 2 ? 20 : (params->neighbourKind == 3 ? +28 : 8);
      nni nLocal[nti];

      i = di + iBox * iBoxSize;
      if (i >= Nx)
        continue;
      j = dj + jBox * jBoxSize;
      if (j >= Ny)
        continue;
      k = dk + kBox * kBoxSize;
      if (k >= Nz)
        continue;
      if (pti(i, j, k) == 0)
        continue;
      int im = (i - 1), ip = (i + 1);
      int jm = (j - 1), jp = (j + 1);
      int km = (k - 1), kp = (k + 1);
      int neighbour[6] = {
          params->XBound(ip, Nx), params->XBound(im, Nx),
          params->YBound(jp, Ny), params->YBound(jm, Ny),
          params->ZBound(kp, Nz), params->ZBound(km, Nz)};
      setNni(i + Nx * (j + Ny * k ), 1, &nLocal[0], ni, pt);
      setNni(ip+ Nx * (j + Ny * k ), neighbour[0], &nLocal[1], ni, pt);
      setNni(im+ Nx * (j + Ny * k ), neighbour[1], &nLocal[2], ni, pt);
      setNni(i + Nx * (jp+ Ny * k ), neighbour[2], &nLocal[3], ni, pt);
      setNni(i + Nx * (jm+ Ny * k ), neighbour[3], &nLocal[4], ni, pt);
      setNni(i + Nx * (j + Ny * kp), neighbour[4], &nLocal[5], ni, pt);
      setNni(i + Nx * (j + Ny * km), neighbour[5], &nLocal[6], ni, pt);
      if (nLocal[0].pt > 1) {
        nLocal[7].x = geometry->ns[(i + Nx * (j + Ny * k)) * 3 + 0];
        nLocal[7].y = geometry->ns[(i + Nx * (j + Ny * k)) * 3 + 1];
        nLocal[7].z = geometry->ns[(i + Nx * (j + Ny * k)) * 3 + 2];
        nLocal[7].pt = 1;
        //~ printf("%g %g %g %d\n",nLocal[7].x,nLocal[7].y,nLocal[7].z,nLocal[7].pt );
      }
      if (params->neighbourKind > 1) {
        setNni(ip+ Nx * (jp+ Ny * k ), neighbour[0] * neighbour[2], &nLocal[ 8], ni, pt);
        setNni(ip+ Nx * (jm+ Ny * k ), neighbour[0] * neighbour[3], &nLocal[ 9], ni, pt);
        setNni(ip+ Nx * (j + Ny * kp), neighbour[0] * neighbour[4], &nLocal[10], ni, pt);
        setNni(ip+ Nx * (j + Ny * km), neighbour[0] * neighbour[5], &nLocal[11], ni, pt);
        setNni(im+ Nx * (jp+ Ny * k ), neighbour[1] * neighbour[2], &nLocal[12], ni, pt);
        setNni(im+ Nx * (jm+ Ny * k ), neighbour[1] * neighbour[3], &nLocal[13], ni, pt);
        setNni(im+ Nx * (j + Ny * kp), neighbour[1] * neighbour[4], &nLocal[14], ni, pt);
        setNni(im+ Nx * (j + Ny * km), neighbour[1] * neighbour[5], &nLocal[15], ni, pt);
        setNni(i + Nx * (jp+ Ny * kp), neighbour[2] * neighbour[4], &nLocal[16], ni, pt);
        setNni(i + Nx * (jp+ Ny * km), neighbour[2] * neighbour[5], &nLocal[17], ni, pt);
        setNni(i + Nx * (jm+ Ny * kp), neighbour[3] * neighbour[4], &nLocal[18], ni, pt);
        setNni(i + Nx * (jm+ Ny * km), neighbour[3] * neighbour[5], &nLocal[19], ni, pt);
      }
      if (params->neighbourKind == 3) {
        setNni(ip + Nx * (jp + Ny * kp), neighbour[0] * neighbour[2] * neighbour[4], &nLocal[20], ni, pt);
        setNni(ip + Nx * (jp + Ny * km), neighbour[0] * neighbour[2] * neighbour[5], &nLocal[21], ni, pt);
        setNni(ip + Nx * (jm + Ny * kp), neighbour[0] * neighbour[3] * neighbour[4], &nLocal[22], ni, pt);
        setNni(ip + Nx * (jm + Ny * km), neighbour[0] * neighbour[3] * neighbour[5], &nLocal[23], ni, pt);
        setNni(im + Nx * (jp + Ny * kp), neighbour[1] * neighbour[2] * neighbour[4], &nLocal[24], ni, pt);
        setNni(im + Nx * (jp + Ny * km), neighbour[1] * neighbour[2] * neighbour[5], &nLocal[25], ni, pt);
        setNni(im + Nx * (jm + Ny * kp), neighbour[1] * neighbour[3] * neighbour[4], &nLocal[26], ni, pt);
        setNni(im + Nx * (jm + Ny * km), neighbour[1] * neighbour[3] * neighbour[5], &nLocal[27], ni, pt);
      }
      //~ va=gsl_rng_uniform(r)*ang_var;
      va = (2 * gsl_rng_uniform(r[thread]) - 1) * ang_var;
      // Create a rotation candidate
      rotation_type = gsl_rng_uniform(r[thread]);
      {
        if (rotation_type < 0.333) {
          nNew[0] = nix(i, j, k);
          nNew[1] = niy(i, j, k) * cosf(M_PI * va) + niz(i, j, k) * sinf(M_PI * va);
          nNew[2] = niz(i, j, k) * cosf(M_PI * va) - niy(i, j, k) * sinf(M_PI * va);
        } else if (rotation_type < 0.666) {
          nNew[0] = nix(i, j, k) * cosf(M_PI * va) - niz(i, j, k) * sinf(M_PI * va);
          nNew[1] = niy(i, j, k);
          nNew[2] = niz(i, j, k) * cosf(M_PI * va) + nix(i, j, k) * sinf(M_PI * va);
        } else {
          nNew[0] = nix(i, j, k) * cosf(M_PI * va) + niy(i, j, k) * sinf(M_PI * va);
          nNew[1] = niy(i, j, k) * cosf(M_PI * va) - nix(i, j, k) * sinf(M_PI * va);
          nNew[2] = niz(i, j, k);
        }
      }

      // Old energy calculation
      E_old = geometry->latice_Potential(nLocal);
      // New energy calculation
      nLocal[0].x = nNew[0];
      nLocal[0].y = nNew[1];
      nLocal[0].z = nNew[2];
      E_new = geometry->latice_Potential(nLocal);

      // test new config
      if (gsl_rng_uniform(r[thread]) < exp(-(E_new - E_old) / T)) {
        nix(i, j, k) = nNew[0];
        niy(i, j, k) = nNew[1];
        niz(i, j, k) = nNew[2];
        acceptance++;
      }
    }
  }

      // printf("- %d %g %d %g\n",acceptance, 1.0*acceptance/vallid,vallid,ang_var);
  //~   #pragma omp barrier
  if (1.0 * acceptance / vallid < 0.5) {
    ang_var *= 0.99;
    if (ang_var < 0.01)
      ang_var = 0.01;
  } else if (1.0 * acceptance / vallid > 0.5) {
    ang_var /= 0.99;
    if (ang_var > 1.0) {
      ang_var -= 0.5;
    }
  }
}
void Evolve::check_Points(int *pt, Parameters params) {
  VallidPoints = 0;
  int Nx = params.Nx;
  int Ny = params.Ny;
  int Nz = params.Nz;
  for (int k = 0; k < Nz; k++) {
    for (int j = 0; j < Ny; j++) {
      for (int i = 0; i < Nx; i++) {
        if (pti(i, j, k))
          VallidPoints++;
      }
    }
  }
}
