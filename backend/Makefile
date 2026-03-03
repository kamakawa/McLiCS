PROGRAM_GPU := mc_sim
PROGRAM_CPU := mc_sim_cpu

########### Gnu:
COMPILER := g++
GPUCOMP  := nvcc
FLAGS    := -O3 -fopenmp -static
GPUFLAGS := -O3
LIB      := -lm -lgsl -lgslcblas -lgomp

USECUDA := -D CUDA__="CUDA"
ifeq (,$(shell which nvcc))
    .DEFAULT_GOAL=CPU
    USECUDA :=
endif

CPPS   := $(wildcard src/*.cpp)
CUDA   := $(wildcard src/*.cu)
HEADER := $(wildcard include/*.h)

OBJS     := $(patsubst src/%.cpp,build/%.o,${CPPS})
CBJS     := $(patsubst src/%.cu,build/%.cuda.o,${CUDA})
DBGOBJS  := $(patsubst src/%.cpp,build/%dbg.o,${CPPS})
DBGCBJS  := $(patsubst src/%.cu,build/%dbg.cuda.o,${CUDA})

all: ${PROGRAM_GPU}

# ---------------- GPU build ----------------
${PROGRAM_GPU}: ${OBJS} ${CBJS}
	@${GPUCOMP} ${GPUFLAGS} $(filter-out build/simulator.o,${OBJS}) ${CBJS} ${LIB} -o ${PROGRAM_GPU}

# ---------------- CPU build ----------------
CPU: $(filter-out build/simulatorGPU.o,${OBJS})
	@${COMPILER} ${FLAGS} $(filter-out build/simulatorGPU.o,${OBJS}) ${LIB} -o ${PROGRAM_CPU}

# -------------- object rules --------------
${OBJS}: build/%.o: src/%.cpp ${HEADER} | build
	${COMPILER} ${FLAGS} -c $< -o $@ ${USECUDA}

${CBJS}: build/%.cuda.o: src/%.cu | build
	${GPUCOMP} ${GPUFLAGS} -dc -c $< -o $@ -D CUDA__="CUDA"

build:
	@mkdir -p build

debug: ${DBGOBJS} ${DBGCBJS}
	${GPUCOMP} -O0 -g -Xcompiler -fopenmp -lineinfo $(filter-out -O% -fast -static, ${GPUFLAGS}) \
	$(filter-out build/simulatordbg.o,${DBGOBJS}) ${DBGCBJS} ${LIB} -o ${PROGRAM_GPU}_debug

${DBGOBJS}: build/%dbg.o: src/%.cpp | build
	${COMPILER} -O0 -g $(filter-out -O% -fast, ${FLAGS}) -c $< -o $@ ${USECUDA}

${DBGCBJS}: build/%dbg.cuda.o: src/%.cu | build
	${GPUCOMP} -O0 -g $(filter-out -O% -fast, ${GPUFLAGS}) -lineinfo -dc -c $< -o $@ ${USECUDA}

$(patsubst %.o,%dbg.o,${OBJS}): ${HEADER}

renew: clean all

clean:
	@rm -f ${PROGRAM_GPU} ${PROGRAM_CPU} ${PROGRAM_GPU}_debug
	@rm -fr build
	@rm -f *.o

clean-data:
	@echo "Removendo arquivos de dados: director_field_*.csv"
	@rm -f director_field_*.csv