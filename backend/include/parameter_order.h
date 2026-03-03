#ifndef PARAMETER_ORDER_H_
#define PARAMETER_ORDER_H_
#include <gsl/gsl_eigen.h>

#include <iostream>

#include "../include/define.h"
#include "../include/parameter_order.h"
#include "../include/parameters.h"
float Eigen_value_evaluation(float *mat, float *vec);
void Matrice_constructor(float *ni, float *Q, int *pt, Parameters params);
float V_Order_parameter_evaluation(float *mat_b, float *mat_c, float *vec_b, float *vec_c, float PoB);
float VMV(float *M, float *V);
void C_Vector_evaluation(float *vec_n, float *vec_b, float *vec_c);
float Polarization(float *bi, Parameters params);
float lattice_order_parameter(float *ni, int *pt, int i, int j, int k, Parameters params);

#endif
