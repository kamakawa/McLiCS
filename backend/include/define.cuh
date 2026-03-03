#ifndef DEFINE_H_
#define DEFINE_H_

#define njx(i,j,k) nj[(i+Nx*(j+Ny*k))*3+0]
#define njy(i,j,k) nj[(i+Nx*(j+Ny*k))*3+1]
#define njz(i,j,k) nj[(i+Nx*(j+Ny*k))*3+2]
#define pti(i,j,k) pt[(i+Nx*(j+Ny*k))]
#define nix(i,j,k) ni[(i+Nx*(j+Ny*k))*3+0]
#define niy(i,j,k) ni[(i+Nx*(j+Ny*k))*3+1]
#define niz(i,j,k) ni[(i+Nx*(j+Ny*k))*3+2]
#define bix(i,j,k) bi[(i+Nx*(j+Ny*k))*3+0]
#define biy(i,j,k) bi[(i+Nx*(j+Ny*k))*3+1]
#define biz(i,j,k) bi[(i+Nx*(j+Ny*k))*3+2]
#define cix(i,j,k) ci[(i+Nx*(j+Ny*k))*3+0]
#define ciy(i,j,k) ci[(i+Nx*(j+Ny*k))*3+1]
#define ciz(i,j,k) ci[(i+Nx*(j+Ny*k))*3+2]

struct nni
{
  float x;
  float y;
  float z;
  int   pt;
};

#endif

