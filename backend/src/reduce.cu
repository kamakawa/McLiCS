
#include<iostream>
__global__ void reduce_sum(uint *g_idata, uint *g_odata, int max) {
  extern __shared__ uint sdata[];
  // each thread loads one element from global to shared mem
  unsigned int tid = threadIdx.x;
  unsigned int i = blockIdx.x*(blockDim.x) + threadIdx.x;
  if (i>(max-1)) return;
  sdata[tid] = g_idata[i] ;//+ g_idata[i+blockDim.x];
  __syncthreads();
  // get points out of 2^n
  int nOff, nInt;
  for (unsigned int s=1024; s>0; s>>=1){
    if (s<blockDim.x){
      nOff=blockDim.x-s;
      nInt=s;
      break;
    }
  }
  if((tid+nOff+1)>blockDim.x){
    sdata[tid-nOff] += sdata[tid];
    return;
  }  
  __syncthreads();
  // do reduction in shared mem
  for (unsigned int s=nInt/2; s>0; s>>=1) {
  if (tid < s)
  sdata[tid] += sdata[tid + s];
  __syncthreads();
  }
    if (tid == 0) g_odata[blockIdx.x] = sdata[0];  
}
__global__ void reduce_sum(double *g_idata, double *g_odata, int max) {
  extern __shared__ double ddata[];
  // each thread loads one element from global to shared mem
  unsigned int tid = threadIdx.x;
  unsigned int i = blockIdx.x*(blockDim.x) + threadIdx.x;
  if (i>(max-1)) return;
  ddata[tid] = g_idata[i] ;//+ g_idata[i+blockDim.x];
  __syncthreads();
  // get points out of 2^n
  int nOff, nInt;
  for (unsigned int s=1024; s>0; s>>=1){
    if (s<blockDim.x){
      nOff=blockDim.x-s;
      nInt=s;
      break;
    }
  }
  if((tid+nOff+1)>blockDim.x){
    ddata[tid-nOff] += ddata[tid];
    return;
  }  
  __syncthreads();
  // do reduction in shared mem
  for (unsigned int s=nInt/2; s>0; s>>=1) {
  if (tid < s)
  ddata[tid] += ddata[tid + s];
  __syncthreads();
  }
  //~ if (tid < 32) warpReduce(sdata, tid);
    // write result for this block to global mem
    if (tid == 0) {g_odata[blockIdx.x] = ddata[0];  printf("%d %d\n",blockIdx.x,ddata[0]);}
}
__global__ void reduce_sum(float *g_idata, float *g_odata, int max) {
  extern __shared__ float fdata[];
  // each thread loads one element from global to shared mem
  unsigned int tid = threadIdx.x;
  unsigned int i = blockIdx.x*(blockDim.x) + threadIdx.x;
  if (i>(max-1)) return;
  fdata[tid] = g_idata[i] ;//+ g_idata[i+blockDim.x];
  __syncthreads();
  // get points out of 2^n
  int nOff, nInt;
  for (unsigned int s=1024; s>0; s>>=1){
    if (s<blockDim.x){
      nOff=blockDim.x-s;
      nInt=s;
      break;
    }
  }
  if((tid+nOff+1)>blockDim.x){
    fdata[tid-nOff] += fdata[tid];
    return;
  }  
  __syncthreads();
  // do reduction in shared mem
  for (unsigned int s=nInt/2; s>0; s>>=1) {
  if (tid < s)
  fdata[tid] += fdata[tid + s];
  __syncthreads();
  }
  //~ if (tid < 32) warpReduce(sdata, tid);
    // write result for this block to global mem
    if (tid == 0) g_odata[blockIdx.x] = fdata[0];  
}
