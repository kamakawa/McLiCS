#include <cstdlib>
#include <cstring>
#include <strings.h>
#include <iostream>

#include "../include/ic.h"
#include "../include/simulator.h"

// Evolve/Geometry headers are included here (cpp) to keep simulator.h lightweight.
#include "../include/evolve.h"
#include "../include/geometry.h"
#include "../include/potential.h"
#include "../include/io.h"

simulator::simulator(Parameters *params_in)
    : params(params_in), Nx(params_in ? params_in->Nx : 0), Ny(params_in ? params_in->Ny : 0), Nz(params_in ? params_in->Nz : 0) {}

simulator::~simulator() {
  // Note: Evolve now has a virtual destructor, so deleting via base pointer is safe.
  delete evolve;
  evolve = nullptr;

  std::free(ni);
  ni = nullptr;

  std::free(pt);
  pt = nullptr;
}

void simulator::Setup_simmulation(Parameters &p) {
  // Allocate once. If user calls Setup multiple times, release old data first.
  delete evolve;
  evolve = nullptr;
  std::free(ni);
  ni = nullptr;
  std::free(pt);
  pt = nullptr;

  const int Np = p.Nx * p.Ny * p.Nz;     // point types: one int per lattice site
  const int Nn = 3 * Np;                // director components: 3 floats per site

  ni = static_cast<float *>(std::calloc(static_cast<size_t>(Nn), sizeof(float)));
  pt = static_cast<int *>(std::calloc(static_cast<size_t>(Np), sizeof(int)));

  if (!ni || !pt) {
    std::fprintf(stderr, "Out of memory allocating ni/pt (Nx=%d Ny=%d Nz=%d)\n", p.Nx, p.Ny, p.Nz);
    std::exit(2);
  }

  // Select evolve strategy
  if (strcasecmp(p.evol, "thermal") == 0) {
    evolve = new thermalEvolveN(ni, pt, &p);
  } else if (strcasecmp(p.evol, "step") == 0) {
    evolve = new stepEvolveN(ni, pt, &p);
  } else if (strcasecmp(p.evol, "quench") == 0) {
    evolve = new quenchEvolveN(ni, pt, &p);
  } else if (strcasecmp(p.evol, "electric") == 0) {
    evolve = new electricEvolveN(ni, pt, &p);
  } else {
    std::fprintf(stderr, "Evolve '%s' not defined. Try: thermal | step | quench | electric\n", p.evol);
    std::exit(2);
  }

  // Select geometry
  if (strcasecmp(p.geometry, "bulk") == 0) {
    evolve->geometry = new Bulk_Geometry(pt, &p);
  } else if (strcasecmp(p.geometry, "slab") == 0) {
    evolve->geometry = new Slab_Geometry(pt, &p);
  } else if (strcasecmp(p.geometry, "sphere") == 0) {
    evolve->geometry = new Sphere_Geometry(pt, &p);
  } else if (strcasecmp(p.geometry, "custom") == 0) {
    evolve->geometry = new Custom_Geometry(pt, &p);
  } else {
    std::fprintf(stderr, "Geometry '%s' not defined. Try: bulk | slab | sphere | custom\n", p.geometry);
    std::exit(2);
  }

  // Boundary conditions
  if (strcasecmp(p.XBoundtype, "free") == 0) {
    p.XBound = &Free_Boundary;
  } else if (strcasecmp(p.XBoundtype, "periodic") == 0) {
    p.XBound = &Periodic_Boundary;
  } else {
    std::fprintf(stderr, "X boundary condition '%s' not implemented\n", p.XBoundtype);
    std::exit(2);
  }

  if (strcasecmp(p.YBoundtype, "free") == 0) {
    p.YBound = &Free_Boundary;
  } else if (strcasecmp(p.YBoundtype, "periodic") == 0) {
    p.YBound = &Periodic_Boundary;
  } else {
    std::fprintf(stderr, "Y boundary condition '%s' not implemented\n", p.YBoundtype);
    std::exit(2);
  }

  if (strcasecmp(p.ZBoundtype, "free") == 0) {
    p.ZBound = &Free_Boundary;
  } else if (strcasecmp(p.ZBoundtype, "periodic") == 0) {
    p.ZBound = &Periodic_Boundary;
  } else {
    std::fprintf(stderr, "Z boundary condition '%s' not implemented\n", p.ZBoundtype);
    std::exit(2);
  }

  evolve->geometry->Boundary_Init(&p);
  evolve->check_Points(pt, p);
  apply_Initial_Condidions(ni, pt, p);

  // Select bulk potential
  if (strcasecmp(p.potential, "ll") * strcasecmp(p.potential, "lebwohl-lahser") == 0) {
    evolve->geometry->bulk_potential = &Bulk_Energy_Lebwohl_Lasher;
    std::printf("Using Lebwohl-Lasher potential\n");
  } else if (strcasecmp(p.potential, "ghrl") * strcasecmp(p.potential, "grun-hess") == 0) {
    evolve->geometry->bulk_potential = &Bulk_Energy_GHRL;
    setGHRL(p);
    std::printf("Using Gruhn-Hess (GHRL) potential\n");
  } else if (strcasecmp(p.potential, "pear") == 0) {
    evolve->geometry->bulk_potential = &Bulk_Energy_Selinger_Pear;
    std::printf("Using splay-bend (Pear) potential\n");
  } else {
    std::fprintf(stderr, "Potential '%s' not implemented. Try: LL | GHRL | pear\n", p.potential);
    std::exit(2);
  }
}

int simulator::print_n(const char *fname, const Parameters *p) const {
  if (!fname || !p || !ni || !pt) {
    std::fprintf(stderr, "print_n called with null data\n");
    return 1;
  }

  FILE *output = std::fopen(fname, "w");
  if (!output) {
    std::perror(fname);
    return 1;
  }

  std::fprintf(output, "x,y,z,nx,ny,nz,s,pt\n");
  for (int k = 0; k < p->Nz; k++) {
    for (int j = 0; j < p->Ny; j++) {
      for (int i = 0; i < p->Nx; i++) {
        std::fprintf(output, "%d,%d,%d,%g,%g,%g,1,%d\n",
                     i, j, k,
                     nix(i, j, k), niy(i, j, k), niz(i, j, k),
                     pti(i, j, k));
      }
    }
  }

  std::fclose(output);
  std::printf("Snapshot saved in %s\n", fname);
  return 0;
}