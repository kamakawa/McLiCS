#ifndef STRING_CUH_
#define STRING_CUH_
__device__ int d_tolower(int ch);
__device__ int d_strcmp(const char *str_a, const char *str_b, unsigned len = 256);
#endif
