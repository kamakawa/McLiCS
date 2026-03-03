#include "../include/io.h"

#include <math.h>
#include <string.h>

#include <fstream>
#include <iostream>

#include "../include/define.h"
#include "../include/evolve.h"
#include "../include/ic.h"
#include "../include/parameters.h"
#include "../include/potential.h"

int print_n(const char *fname, float *ni, Parameters params, int *pt) {
  int Nx = params.Nx;
  int Ny = params.Ny;
  int Nz = params.Nz;
  float S;
  FILE *output = fopen(fname, "w");
  if (output == 0) {
    perror(fname);
    return 1;
  }
  fprintf(output, "x,y,z,nx,ny,nz,S,pt\n");

  for (int k = 0; k < params.Nz; k++) {
    for (int j = 0; j < params.Ny; j++) {
      for (int i = 0; i < params.Nx; i++) {
        S = pti(i, j, k) ? lattice_order_parameter(ni, pt, i, j, k, params) : 1;
        fprintf(output, "%d,%d,%d,%g,%g,%g,%g,%d\n", i, j, k,
                nix(i, j, k), niy(i, j, k), niz(i, j, k), S, pti(i, j, k));
      }
    }
  }
  printf("Snapshot saved in %s\n", fname);
  fflush(stdout);
  fclose(output);
  return 0;
}
Parameters read_input_file(const char *fname) {
  Parameters input_params;
  std::ifstream input_file;
  int nn;
  if (fname == NULL) {
    printf("File not found, using standart parameter values\n");
    return input_params;
  } else {
    input_file.open(fname);
    if (!input_file) {
      perror(fname);
      exit(5);
    }
    std::cout << "Using \"" << fname << "\" as input file\n\n";
  }
  char parser[200];
  char *garbage = (char *)malloc(400);

  while (input_file >> parser) {
    if (strcasecmp(parser, "nx") == 0) {
      input_file >> input_params.Nx;
      input_file.getline(garbage, 400);
    } else if (strcasecmp(parser, "ny") == 0) {
      input_file >> input_params.Ny;
      input_file.getline(garbage, 400);
    } else if (strcasecmp(parser, "nz") == 0) {
      input_file >> input_params.Nz;
      input_file.getline(garbage, 400);
    } else if (strcasecmp(parser, "A") == 0) {
      input_file >> input_params.A;
      input_file.getline(garbage, 400);
    } else if (strcasecmp(parser, "B1") == 0) {
      input_file >> input_params.B1;
      input_file.getline(garbage, 400);
    } else if (strcasecmp(parser, "B2") == 0) {
      input_file >> input_params.B2;
      input_file.getline(garbage, 400);
    } else if (strcasecmp(parser, "C") == 0) {
      input_file >> input_params.C;
      input_file.getline(garbage, 400);
    } else if (strcasecmp(parser, "Ti") == 0) {
      input_file >> input_params.Ti;
      input_file.getline(garbage, 400);
    } else if (strcasecmp(parser, "Tf") == 0) {
      input_file >> input_params.Tf;
      input_file.getline(garbage, 400);
    } else if (strcasecmp(parser, "dT") == 0) {
      input_file >> input_params.dT;
      input_file.getline(garbage, 400);
    } else if (strcasecmp(parser, "MCS") == 0) {
      input_file >> input_params.MCS;
      input_file.getline(garbage, 400);
    } else if (strcasecmp(parser, "MCT") == 0) {
      input_file >> input_params.MCT;
      input_file.getline(garbage, 400);
    } else if (strcasecmp(parser, "ic") == 0) {
      input_file >> input_params.ic;
      input_file.getline(garbage, 400);
    } else if (strcasecmp(parser, "ic_file") == 0) {
      input_file >> input_params.ic_file;
      input_file.getline(garbage, 400);
    } else if (strcasecmp(parser, "xbound") == 0) {
      input_file >> input_params.XBoundtype;
      input_file.getline(garbage, 400);
    } else if (strcasecmp(parser, "ybound") == 0) {
      input_file >> input_params.YBoundtype;
      input_file.getline(garbage, 400);
    } else if (strcasecmp(parser, "zbound") == 0) {
      input_file >> input_params.ZBoundtype;
      input_file.getline(garbage, 400);
    } else if (strcasecmp(parser, "potential") == 0) {
      input_file >> input_params.potential;
      input_file.getline(garbage, 400);
    } else if (strcasecmp(parser, "evol")*strcasecmp(parser, "mode") == 0) {
      input_file >> input_params.evol;
      input_file.getline(garbage, 400);
    } else if (strcasecmp(parser, "k11") == 0) {
      input_file >> input_params.k11;
      input_file.getline(garbage, 400);
    } else if (strcasecmp(parser, "k22") == 0) {
      input_file >> input_params.k22;
      input_file.getline(garbage, 400);
    } else if (strcasecmp(parser, "k33") == 0) {
      input_file >> input_params.k33;
      input_file.getline(garbage, 400);
    } else if (strcasecmp(parser, "p0") == 0) {
      input_file >> input_params.p0;
      input_file.getline(garbage, 400);
    } else if (strcasecmp(parser, "phi_0") == 0) {
      input_file >> input_params.phi_0;
      input_file.getline(garbage, 400);
    } else if (strcasecmp(parser, "theta_0") == 0) {
      input_file >> input_params.theta_0;
      input_file.getline(garbage, 400);
    } else if (strcasecmp(parser, "p0_i") == 0) {
      input_file >> input_params.p0_i;
      input_file.getline(garbage, 400);
    } else if (strcasecmp(parser, "fn") == 0) {
      input_file >> input_params.fn;
      input_file.getline(garbage, 400);
    } else if (strcasecmp(parser, "first_file_number") * strcasecmp(parser, "initial_output") == 0) {
      input_file >> input_params.first_file;
      input_file.getline(garbage, 400);
    } else if (parser[0] == '#') {
      input_file.getline(garbage, 400);
    } else if (strcasecmp(parser, "geometry") == 0) {
      input_file >> input_params.geometry;
      input_file.getline(garbage, 400);
    } else if (strcasecmp(parser, "boundary_file") == 0) {
      input_file >> input_params.bound_file_name;
      input_file.getline(garbage, 400);
    } else if (strcasecmp(parser, "anchoring_type") == 0) {
      input_file >> nn;
      input_file >> input_params.anchoring_type[nn];
      input_file.getline(garbage, 400);
    } else if (strcasecmp(parser, "W") == 0) {
      input_file >> nn;
      input_file >> input_params.W[nn];
      input_file.getline(garbage, 400);
    } else if (strcasecmp(parser, "phi_s") == 0) {
      input_file >> nn;
      input_file >> input_params.phi_s[nn];
      input_file.getline(garbage, 400);
    } else if (strcasecmp(parser, "theta_s") == 0) {
      input_file >> nn;
      input_file >> input_params.theta_s[nn];
      input_file.getline(garbage, 400);
    } else if (strcasecmp(parser, "nk") * strcasecmp(parser, "neighbour_kind") * strcasecmp(parser, "neighbour") == 0) {
      input_file >> input_params.neighbourKind;
      input_file.getline(garbage, 400);
    } else if (strcasecmp(parser, "elecX")*strcasecmp(parser, "Electric_field_x")*strcasecmp(parser, "EF_x") == 0) {
      input_file >> input_params.elecX;
      input_file.getline(garbage, 400);
    } else if (strcasecmp(parser, "elecY")*strcasecmp(parser, "Electric_field_y")*strcasecmp(parser, "EF_y")  == 0) {
      input_file >> input_params.elecY;
      input_file.getline(garbage, 400);
    } else if (strcasecmp(parser, "elecZ")*strcasecmp(parser, "Electric_field_z")*strcasecmp(parser, "EF_z")  == 0) {
      input_file >> input_params.elecZ;
      input_file.getline(garbage, 400);
    } else if (strcasecmp(parser, "Ei")*strcasecmp(parser, "initial_E")  == 0) {
      input_file >> input_params.elecEi;
      input_file.getline(garbage, 400);
    } else if (strcasecmp(parser, "Ef")*strcasecmp(parser, "final_E")  == 0) {
      input_file >> input_params.elecEf;
      input_file.getline(garbage, 400);
    } else if (strcasecmp(parser, "dE")*strcasecmp(parser, "E_variation")  == 0) {
      input_file >> input_params.elecdE;
      input_file.getline(garbage, 400);
    } else if (strcasecmp(parser, "elecA")*strcasecmp(parser, "dielectric_anisotropy")*strcasecmp(parser, "Aniso_E")  == 0) {
      input_file >> input_params.elecA;
      input_file.getline(garbage, 400);
    } else if (strcasecmp(parser, "rhoScale")*strcasecmp(parser, "rho_Scale") == 0) {
      input_file >> input_params.rhoScale;
      input_file.getline(garbage, 400);
    } else if (strcasecmp(parser, "lambdaScale")*strcasecmp(parser, "lambda_Scale") == 0) {
      input_file >> input_params.lambdaScale;
      input_file.getline(garbage, 400);
    } else if (strcasecmp(parser, "muScale")*strcasecmp(parser, "mu_Scale") == 0) {
      input_file >> input_params.muScale;
      input_file.getline(garbage, 400);
    } else if (strcasecmp(parser, "nuScale")*strcasecmp(parser, "nu_Scale") == 0) {
      input_file >> input_params.nuScale;
      input_file.getline(garbage, 400);
    } else if (strcasecmp(parser, "sigmaScale")*strcasecmp(parser, "sigma_Scale") == 0) {
      input_file >> input_params.sigmaScale;
      input_file.getline(garbage, 400);
    } else {
      printf("%c\n", parser[0]);
      fprintf(stderr, "invalid parameter %s!!\n", parser);
      exit(3);
    }
    check_error_bits(&input_file, parser);
  }

  return input_params;
}
void print_parameters(Parameters params) {
  printf("###Using the following parameters for this simulation.###\n");
  printf("Nx  %d\n", params.Nx);
  printf("Ny  %d\n", params.Ny);
  printf("Nz  %d\n", params.Nz);

  printf("MCS %d\n", params.MCS);
  printf("MCT %d\n", params.MCT);
  if (strcasecmp(params.ic, "ic_file") == 0) printf("ic_file  %s\n", params.ic_file);
  printf("mode  %s\n", params.potential);
  if (params.elecA){
  printf("###Electric Field###\n");
  printf("Electric_Field_x  %g\n", params.elecX);
  printf("Electric_Field_y  %g\n", params.elecY);
  printf("Electric_Field_z  %g\n", params.elecZ);
  printf("Dielectric_Anisotropy  %g\n", params.elecA);



  }
  printf("\n");
}
void setGHRL(Parameters &params) {
  float k11 = params.k11;
  float k22 = params.k22;
  float k33 = params.k33;
  float p0 = params.p0;
  float Scale = fabs((9.0) / (k11 - 3 * k22 - k33));

  params.ghrl_sigma = p0 ? -Scale * k22 * (2 * M_PI / p0) : 0;
  params.ghrl_lambda = (Scale / 9) * (2 * k11 - 3 * k22 + k33);
  params.ghrl_mu = Scale * (k22 - k11);
  params.ghrl_rho = (Scale / 9) * (k11 - k33);
  params.ghrl_nu = (Scale / 9) * (k11 - 3 * k22 - k33);
  params.neighbourScale = (k11 + k33) / k22;
  printf("### Elastic parameters:\n");
  printf("k11 %g \nk22 %g \nk33 %g\n", k11, k22, k33);
  printf("lambda %g\n", params.ghrl_lambda);
  printf("mu     %g\n", params.ghrl_mu);
  printf("rho    %g\n", params.ghrl_rho);
  printf("nu     %g\n", params.ghrl_nu);
  printf("sigma  %g\n\n", params.ghrl_sigma);
  printf("#scaled by  %g\n\n", Scale);
  if (params.neighbourKind==2){
    printf("### Second Neighbours Parameters Scale");
    printf("lambda_Scale %g\n",params.lambdaScale);
    printf("mu_Scale %g\n",params.muScale);
    printf("rho_Scale %g\n",params.rhoScale);
    printf("nu_Scale %g\n",params.nuScale);
    printf("sigma_Scale %g\n",params.sigmaScale);
  }
}

void check_error_bits(std::ifstream *f, const char *parser) {
  int stop = 0;
  if (f->eof()) {
    perror("stream eofbit. error state");
    // EOF after std::getline() is not the criterion to stop processing
    // data: In case there is data between the last delimiter and EOF,
    // getline() extracts it and sets the eofbit.
    stop = 0;
  }
  if (f->fail()) {
    std::cerr << "Invalid value to parameter " << parser << std::endl;
    exit(1);
  }
  if (f->bad()) {
    std::cerr << "stream badbit. error state" << std::endl;
    exit(1);
  }
}
