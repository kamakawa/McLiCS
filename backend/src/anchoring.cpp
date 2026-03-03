#include "../include/anchoring.h"

#include <gsl/gsl_rng.h>
#include <math.h>
#include <string.h>

#include <iostream>
#include <map>
#include <vector>

#include "../include/parameters.h"
#include "../include/potential.h"

void Anchoring::check_parameter(bool std_val, std::string parameter_name) {
  if (std_val)
    std::cout << "Parameter " << parameter_name << " is not set. Using standard value.\n";

  else {
    std::cout << "Parameter " << parameter_name << " not defined for the boundary condition "
              << "#" << id << ".\n";
    std::cout << "The boundary condition " << this->name << " needs the aforementioned parameter defined.\n";
    std::cout << "Please, set it in your input file, or check if it is mispelled.\n";
    std::cout << "Aborting the program.\n";
    exit(1);
  }
}
