#ifndef SIMULATOR_H_
#define SIMULATOR_H_

#include "../include/parameters.h"

class Evolve;

class simulator {
 public:
  explicit simulator(Parameters *params);
  ~simulator();

  void Setup_simmulation(Parameters &params);
  int print_n(const char *fname, const Parameters *params) const;

  Parameters *params = nullptr;
  int Nx = 0, Ny = 0, Nz = 0;

  Evolve *evolve = nullptr;  // owned
  int *pt = nullptr;         // owned

 private:
  float *ni = nullptr;       // owned
};

#endif  // SIMULATOR_H_