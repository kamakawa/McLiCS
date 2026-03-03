#ifndef ANCHORING_H_
#define ANCHORING_H_

#include <gsl/gsl_rng.h>
#include <iostream>
#include <vector>
#include "../include/define.h"
#include "../include/io.h"
#include "../include/monte_carlo.h"
#include "../include/parameter_order.h"
#include "../include/parameters.h"
#include "../include/potential.h"

class Anchoring {
 public:
  virtual ~Anchoring() = default;

  //~     Anchoring();
  char name[50];
  int id;
  Parameters* params;
  virtual const char* getName() const { return name; }
  virtual float surface_potential(float ni[3], float s[3]) { return 0; };
  void check_parameter(bool std_val, std::string parameter_name);
};

class Strong_Anchoring : public Anchoring {
 public:
  char name[50] = "Strong Anchoring";
  Strong_Anchoring(Parameters* params, int id);
  float W, theta_s, phi_s;
  const char* getName() const { return name; }
  float surface_potential(float ni[3], float s[3]);
};

class RP_Anchoring : public Anchoring {
 public:
  char name[50] = "Rapine Papoular Anchoring";
  RP_Anchoring(Parameters* params, int id);
  float W, theta_s, phi_s;
  const char* getName() const { return name; }
  float surface_potential(float ni[3], float s[3]);
};

class FG_Anchoring : public Anchoring {
 public:
  char name[50] = "Founier-Galatola like Anchoring";
  FG_Anchoring(Parameters* params, int id);
  float W, theta_s, phi_s;
  const char* getName() const { return name; }
  float surface_potential(float ni[3], float s[3]);
};
class Homeotropic_Anchoring : public Anchoring {
 public:
  char name[50] = "Homeotropic Anchoring";
  Homeotropic_Anchoring(Parameters* params, int id);
  float W, theta_s, phi_s;
  const char* getName() const { return name; }
  float surface_potential(float ni[3], float s[3]);
};

class Strong_Anchoring_GHRL : public Anchoring {
 public:
  char name[50] = "Strong Anchoring GHRL";
  Strong_Anchoring_GHRL(Parameters* params, int id);
  float W, theta_s, phi_s;
  const char* getName() const { return name; }
  float surface_potential(float ni[3], float s[3]);
};

class RP_Anchoring_GHRL : public Anchoring {
 public:
  char name[50] = "Rapine Papoular Anchoring GHRL";
  RP_Anchoring_GHRL(Parameters* params, int id);
  float W, theta_s, phi_s;
  const char* getName() const { return name; }
  float surface_potential(float ni[3], float s[3]);
};

class FG_Anchoring_GHRL : public Anchoring {
 public:
  char name[50] = "Founier-Galatola like Anchoring GHRL";
  FG_Anchoring_GHRL(Parameters* params, int id);
  float W, theta_s, phi_s;
  const char* getName() const { return name; }
  float surface_potential(float ni[3], float s[3]);
};
class Homeotropic_Anchoring_GHRL : public Anchoring {
 public:
  char name[50] = "Homeotropic Anchoring GHRL";
  Homeotropic_Anchoring_GHRL(Parameters* params, int id);
  float W, theta_s, phi_s;
  const char* getName() const { return name; }
  float surface_potential(float ni[3], float s[3]);
};
#endif