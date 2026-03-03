#ifndef IO_H_
#define IO_H_

#include <fstream>
#include "../include/define.h"
#include "../include/parameters.h"

int print_nbc(const char *fname, float *ni, float *bi, float *ci, Parameters params);
int print_n(const char *fname, float *ni, Parameters params, int *pt);

void setGHRL(Parameters &params);
Parameters read_input_file(const char *fname);
void print_parameters(Parameters params);
void Setup_simmulation(float **ni, float **bi, float **ci, Parameters &params);
void check_error_bits(std::ifstream *f, const char *parser);

#endif