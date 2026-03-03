#include <iostream>
#include <string>
#include <string.h>
#include <gsl/gsl_rng.h>
#include <math.h>
#include <vector>
#include "../include/anchoring.h"
#include "../include/geometry.h"
#include "../include/parameters.h"
#include "../include/potential.cuh"

#include <map>
__device__ extern float (*bulk_potentialGPU)(float ni[3], float nj[3], Parameters *params, float rij[3], int nk);
__device__ extern p_Surface_Potential *d_Surface_Potential_GPU; 
__device__ extern float *d_W; 
__device__ inline float newman_neighbours_GPU(const nni fullni[], Parameters *params){
  float rij[3];
  double E=0;
  float ni[3]={fullni[0].x,fullni[0].y,fullni[0].z};
  
  if (fullni[1].pt){
    float nj[3]={fullni[1].x,fullni[1].y,fullni[1].z};
    rij[0]=1; rij[1]=0; rij[2]=0;
    E+= bulk_potentialGPU(ni,nj,params,rij,1);
  }
  if (fullni[2].pt){
    float nj[3]={fullni[2].x,fullni[2].y,fullni[2].z};
    rij[0]=-1; rij[1]=0; rij[2]=0;
    E+= bulk_potentialGPU(ni,nj,params,rij,1);
  }
  if (fullni[3].pt){
    float nj[3]={fullni[3].x,fullni[3].y,fullni[3].z};
    rij[0]=0; rij[1]=1; rij[2]=0;
    E+= bulk_potentialGPU(ni,nj,params,rij,1);
  }
  if (fullni[4].pt){
    float nj[3]={fullni[4].x,fullni[4].y,fullni[4].z};
    rij[0]=0; rij[1]=-1; rij[2]=0;
    E+= bulk_potentialGPU(ni,nj,params,rij,1);
  }
  if (fullni[5].pt){
    float nj[3]={fullni[5].x,fullni[5].y,fullni[5].z};
    rij[0]=0; rij[1]=0; rij[2]=1;
    E+= bulk_potentialGPU(ni,nj,params,rij,1);
  }
  if (fullni[6].pt){
    float nj[3]={fullni[6].x,fullni[6].y,fullni[6].z};
    rij[0]=0; rij[1]=0; rij[2]=-1;
    E+= bulk_potentialGPU(ni,nj,params,rij,1);
  }

  return E;
}
__device__ inline float second_nerghbours_GPU(const nni fullni[], Parameters *params){
  float rij[3];
  double E=0;
  float ni[3]={fullni[0].x,fullni[0].y,fullni[0].z};
  
  const float isqrt2= 0.707106781;
  if (fullni[8].pt){
    float nj[3]={fullni[8].x,fullni[8].y,fullni[8].z};
    rij[0]=isqrt2; rij[1]=isqrt2; rij[2]=0;
    E+= bulk_potentialGPU(ni,nj,params,rij,2);
  }
  if (fullni[9].pt){
    float nj[3]={fullni[9].x,fullni[9].y,fullni[9].z};
    rij[0]=isqrt2; rij[1]=-isqrt2; rij[2]=0;
    E+= bulk_potentialGPU(ni,nj,params,rij,2);
  }
  if (fullni[10].pt){
    float nj[3]={fullni[10].x,fullni[10].y,fullni[10].z};
    rij[0]=isqrt2; rij[1]=0; rij[2]=isqrt2;
    E+= bulk_potentialGPU(ni,nj,params,rij,2);
  }
  if (fullni[11].pt){
    float nj[3]={fullni[11].x,fullni[11].y,fullni[11].z};
    rij[0]=isqrt2; rij[1]=0; rij[2]=-isqrt2;
    E+= bulk_potentialGPU(ni,nj,params,rij,2);
  }
  if (fullni[12].pt){
    float nj[3]={fullni[12].x,fullni[12].y,fullni[12].z};
    rij[0]=-isqrt2; rij[1]=isqrt2; rij[2]=0;
    E+= bulk_potentialGPU(ni,nj,params,rij,2);
  }
  if (fullni[13].pt){
    float nj[3]={fullni[13].x,fullni[13].y,fullni[13].z};
    rij[0]=-isqrt2; rij[1]=-isqrt2; rij[2]=0;
    E+= bulk_potentialGPU(ni,nj,params,rij,2);
  }
  if (fullni[14].pt){
    float nj[3]={fullni[14].x,fullni[14].y,fullni[14].z};
    rij[0]=-isqrt2; rij[1]=0; rij[2]=isqrt2;
    E+= bulk_potentialGPU(ni,nj,params,rij,2);
  }
  if (fullni[15].pt){
    float nj[3]={fullni[15].x,fullni[15].y,fullni[15].z};
    rij[0]=-isqrt2; rij[1]=0; rij[2]=-isqrt2;
    E+= bulk_potentialGPU(ni,nj,params,rij,2);
  }
  if (fullni[16].pt){
    float nj[3]={fullni[16].x,fullni[16].y,fullni[16].z};
    rij[0]=0; rij[1]=isqrt2; rij[2]=isqrt2;
    E+= bulk_potentialGPU(ni,nj,params,rij,2);
  }
  if (fullni[17].pt){
    float nj[3]={fullni[17].x,fullni[17].y,fullni[17].z};
    rij[0]=0; rij[1]=isqrt2; rij[2]=-isqrt2;
    E+= bulk_potentialGPU(ni,nj,params,rij,2);
  }
  if (fullni[18].pt){
    float nj[3]={fullni[18].x,fullni[18].y,fullni[18].z};
    rij[0]=0; rij[1]=-isqrt2; rij[2]=isqrt2;
    E+= bulk_potentialGPU(ni,nj,params,rij,2);
  }
  if (fullni[19].pt){
    float nj[3]={fullni[19].x,fullni[19].y,fullni[19].z};
    rij[0]=0; rij[1]=-isqrt2; rij[2]=-isqrt2;
    E+= bulk_potentialGPU(ni,nj,params,rij,2);
  }
  return E;
  
}  
__device__ inline float third_nerghbours_GPU(const nni fullni[], Parameters *params){
  float rij[3];
  double E=0;
  float ni[3]={fullni[0].x,fullni[0].y,fullni[0].z};
  
  const float isqrt3= 0.577350269;
  if (fullni[20].pt){
    float nj[3]={fullni[20].x,fullni[20].y,fullni[20].z};
    rij[0]= isqrt3; rij[1]= isqrt3; rij[2]= isqrt3;
    E+= bulk_potentialGPU(ni,nj,params,rij,3);
  }
  if (fullni[21].pt){
    float nj[3]={fullni[21].x,fullni[21].y,fullni[21].z};
    rij[0]= isqrt3; rij[1]= isqrt3; rij[2]=-isqrt3;
    E+= bulk_potentialGPU(ni,nj,params,rij,3);
  }
  if (fullni[22].pt){
    float nj[3]={fullni[22].x,fullni[22].y,fullni[22].z};
    rij[0]= isqrt3; rij[1]=-isqrt3; rij[2]= isqrt3;
    E+= bulk_potentialGPU(ni,nj,params,rij,3);
  }
  if (fullni[23].pt){
    float nj[3]={fullni[23].x,fullni[23].y,fullni[23].z};
    rij[0]= isqrt3; rij[1]=-isqrt3; rij[2]=-isqrt3;
    E+= bulk_potentialGPU(ni,nj,params,rij,3);
  }
  if (fullni[24].pt){
    float nj[3]={fullni[24].x,fullni[24].y,fullni[24].z};
    rij[0]=-isqrt3; rij[1]= isqrt3; rij[2]= isqrt3;
    E+= bulk_potentialGPU(ni,nj,params,rij,3);
  }
  if (fullni[25].pt){
    float nj[3]={fullni[25].x,fullni[25].y,fullni[25].z};
    rij[0]=-isqrt3; rij[1]= isqrt3; rij[2]=-isqrt3;
    E+= bulk_potentialGPU(ni,nj,params,rij,3);
  }
  if (fullni[26].pt){
    float nj[3]={fullni[26].x,fullni[26].y,fullni[26].z};
    rij[0]=-isqrt3; rij[1]=-isqrt3; rij[2]= isqrt3;
    E+= bulk_potentialGPU(ni,nj,params,rij,3);
  }
  if (fullni[27].pt){
    float nj[3]={fullni[27].x,fullni[27].y,fullni[27].z};
    rij[0]=-isqrt3; rij[1]=-isqrt3; rij[2]=-isqrt3;
    E+= bulk_potentialGPU(ni,nj,params,rij,3);
  }
  return E;
}

__device__ float Bulk_latice_Potential_GPU(const nni fullni[], Parameters *params){
  float E=0;
  
  float ni[3]={fullni[0].x,fullni[0].y,fullni[0].z};
  
  E=newman_neighbours_GPU(fullni,params);
  if (params->neighbourKind>1)
    E+=second_nerghbours_GPU(fullni,params);
  if (params->neighbourKind==3)
    E+=third_nerghbours_GPU(fullni,params);
  if (params->elecA!=0)  {
    E+=Electric_Potential_GPU(ni,params)  ;
  }
  return E;
}

__device__ float Slab_latice_Potential_GPU(const nni fullni[], Parameters *params){
  float E=0;
  float ni[3]={fullni[0].x,fullni[0].y,fullni[0].z};
  
  E=newman_neighbours_GPU(fullni,params);
  if (params->neighbourKind>1)
    E+=second_nerghbours_GPU(fullni,params);
  if (params->neighbourKind==3)
    E+=third_nerghbours_GPU(fullni,params);
  
  float s[3]={fullni[7].x,fullni[7].y,fullni[7].z};
  if (fullni[0].pt>1) {
    E+= d_W[fullni[0].pt-2]*d_Surface_Potential_GPU[fullni[0].pt-2](ni,s,params,s);}
  if (params->elecA!=0)  {
    E+=Electric_Potential_GPU(ni,params)  ;
  }
  
  return E;
}

__device__ float Custom_latice_Potential_GPU(const nni fullni[], Parameters *params){
  float E=0;
  float ni[3]={fullni[0].x,fullni[0].y,fullni[0].z};
  
  E=newman_neighbours_GPU(fullni,params);
  if (params->neighbourKind>1)
    E+=second_nerghbours_GPU(fullni,params);
  if (params->neighbourKind==3)
    E+=third_nerghbours_GPU(fullni,params);
  float s[3]={fullni[7].x,fullni[7].y,fullni[7].z};

  if (fullni[0].pt>1) 
    E+= d_W[fullni[0].pt-2]*d_Surface_Potential_GPU[fullni[0].pt-2](ni,s,params,s);

  if (params->elecA!=0) 
    E+=Electric_Potential_GPU(ni,params);
      
  return E;
}
 
__device__ float Sphere_latice_Potential_GPU(const nni fullni[], Parameters *params){
  float E=0;
  float ni[3]={fullni[0].x,fullni[0].y,fullni[0].z};
  
  E=newman_neighbours_GPU(fullni,params);
  if (params->neighbourKind>1)
    E+=second_nerghbours_GPU(fullni,params);
  if (params->neighbourKind==3)
    E+=third_nerghbours_GPU(fullni,params);
  float s[3]={fullni[7].x,fullni[7].y,fullni[7].z};
  if (fullni[0].pt>1) 
    E+= d_W[fullni[0].pt-2]*d_Surface_Potential_GPU[fullni[0].pt-2](ni,s,params,s);

  if (params->elecA!=0) 
    E+=Electric_Potential_GPU(ni,params);
  
  return E;
}

__device__ float RP_Surface_Potential_GPU(float ni[3], float s[3], Parameters *params, float rij[3]){
  float nij=ni[0]*s[0]+ni[1]*s[1]+ni[2]*s[2];
  return -nij*nij;
}

__device__ float FG_Surface_Potential_GPU(float ni[3], float s[3], Parameters *params, float rij[3]){
  
  float nij=ni[0]*s[0]+ni[1]*s[1]+ni[2]*s[2];
  return +nij*nij;
}
__device__ float Strong_Anchoring_GPU(float ni[3], float s[3], Parameters *params, float rij[3]){

  return 0;
}

__device__ float RP_Surface_Potential_GHRL_GPU(float ni[3], float s[3], Parameters *params, float rij[3]){
  
  const float el=params->ghrl_lambda;
  const float em=params->ghrl_mu;
  const float en=params->ghrl_nu;
  const float er=params->ghrl_rho;
  const float es=params->ghrl_sigma;
  float v15 = 1.5;
  float v05 = 0.5;
  
  float ai=ni[0]*rij[0]+ni[1]*rij[1]+ni[2]*rij[2];
  float aj=s[0]*rij[0]+s[1]*rij[1]+s[2]*rij[2];
  float nij=ni[0]*s[0]+ni[1]*s[1]+ni[2]*s[2];
  float pij=v15*nij*nij-v05;
  float cross=(ni[2]*s[1]-ni[1]*s[2])*rij[0]
              +(ni[0]*s[2]-ni[2]*s[0])*rij[1]
              +(ni[1]*s[0]-ni[0]*s[1])*rij[2];
    float E1 =((v15*ai*ai)+(v15*aj*aj)-1);
  //~ if (threadIdx.x==0)printf("%0.3f %0.3f %0.3f %0.3f %0.3f \n", ai, aj, cross, nij,(ai*aj*nij));
  return((E1*(er*pij+el)+em*(ai*aj*nij)-(1/9))+en*pij+es*(nij>0?1:-1)*cross);
}
__device__ float FG_Surface_Potential_GHRL_GPU(float ni[3], float s[3], Parameters *params, float rij[3]){
  
  const float el=params->ghrl_lambda;
  const float em=params->ghrl_mu;
  const float en=params->ghrl_nu;
  const float er=params->ghrl_rho;
  const float es=params->ghrl_sigma;
  float v15 = 1.5;
  float v05 = 0.5;
  
  float ai=ni[0]*rij[0]+ni[1]*rij[1]+ni[2]*rij[2];
  float aj=s[0]*rij[0]+s[1]*rij[1]+s[2]*rij[2];
  float nij=ni[0]*s[0]+ni[1]*s[1]+ni[2]*s[2];
  float pij=v15*nij*nij-v05;
  float cross=(ni[2]*s[1]-ni[1]*s[2])*rij[0]
              +(ni[0]*s[2]-ni[2]*s[0])*rij[1]
              +(ni[1]*s[0]-ni[0]*s[1])*rij[2];
    float E1 =((v15*ai*ai)+(v15*aj*aj)-1);
  //~ if (threadIdx.x==0)printf("%0.3f %0.3f %0.3f %0.3f %0.3f \n", ai, aj, cross, nij,(ai*aj*nij));
  return -((E1*(er*pij+el)+em*(ai*aj*nij)-(1/9))+en*pij+es*(nij>0?1:-1)*cross);
}
// __device__ float FG_Surface_Potential_GHRL_GPU(float ni[3], float s[3], parameters *params, float rij[3]){
//   const float el=params->ghrl_lambda;
//   const float em=params->ghrl_mu;
//   const float en=params->ghrl_nu;
//   const float er=params->ghrl_rho;
//   const float es=params->ghrl_sigma;
//   float v15 = 1.5;
//   float v05 = 0.5;
//   float mod=sqrtf(fabs(ni[0]*s[0]+ni[1]*s[1]+ni[2]*s[2]));
//   float nj[3]={ni[0]-s[0]*mod,ni[1]-s[1]*mod,ni[2]-s[2]*mod};
//   mod=sqrtf(fabs(nj[0]*nj[0]+nj[1]*nj[1]+nj[2]*nj[2]));
//   nj[0]/=(mod>0?mod:1);
//   nj[1]/=(mod>0?mod:1);
//   nj[2]/=(mod>0?mod:1);
  
//   float ai=ni[0]*rij[0]+ni[1]*rij[1]+ni[2]*rij[2];
//   float aj=nj[0]*rij[0]+nj[1]*rij[1]+nj[2]*rij[2];
//   float nij=ni[0]*nj[0]+ni[1]*nj[1]+ni[2]*nj[2];
//   float pij=v15*nij*nij-v05;
//   float cross=(ni[2]*nj[1]-ni[1]*nj[2])*rij[0]
//               +(ni[0]*nj[2]-ni[2]*nj[0])*rij[1]
//               +(ni[1]*nj[0]-ni[0]*nj[1])*rij[2];
  
//   float E1 =((v15*ai*ai)+(v15*aj*aj)-1);
//   //~ if (threadIdx.x==0)printf("%0.3f %0.3f %0.3f %0.3f %0.3f \n", ai, aj, cross, nij,(ai*aj*nij));
//   return((E1*(er*pij+el)+em*(ai*aj*nij)-(1/9))+en*pij+es*(nij>0?1:-1)*cross);
// }
__device__ float Strong_Anchoring_GHRL_GPU(float ni[3], float s[3], Parameters *params, float rij[3]){

  return 0;
}
