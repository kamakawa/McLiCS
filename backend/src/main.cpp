#include <gsl/gsl_eigen.h>
#include <gsl/gsl_randist.h>
#include <gsl/gsl_rng.h>
#include <math.h>
#include <string.h>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <dirent.h>
#include <string>

#include <iostream>

#include "../include/define.h"
#include "../include/evolve.h"
#include "../include/io.h"
#include "../include/monte_carlo.h"
#include "../include/parameter_order.h"
#include "../include/parameters.h"
#include "../include/potential.h"
#include "../include/simulator.h"
#define MCLICS_VERSION "0.1"

// Remove arquivos de saida de simulacoes anteriores para evitar mistura de dados
void cleanPreviousOutput() {
    printf("Limpando arquivos de simulacoes anteriores...\n");

    // Remove arquivos especificos fixos
    const char* specificFiles[] = {"ic.csv", "po.dat", nullptr};
    for (int i = 0; specificFiles[i] != nullptr; i++) {
        remove(specificFiles[i]);
    }

    // Remove arquivos dinamicos "director_field_*.csv"
    DIR *dir = opendir(".");
    if (dir != nullptr) {
        struct dirent *entry;
        while ((entry = readdir(dir)) != nullptr) {
            const std::string filename = entry->d_name;

            // Verifica padrao do nome do arquivo
            if (filename.rfind("director_field_", 0) == 0 &&
                filename.size() >= 4 &&
                filename.substr(filename.size() - 4) == ".csv") {

                remove(entry->d_name);
            }
        }
        closedir(dir);
    }

    printf("Limpeza concluida!\n\n");
}

// Gera um resumo estatistico baseado no arquivo po.dat
void printSimulationSummary(Parameters *params) {
    printf("\n=== RELATORIO FINAL DA SIMULACAO ===\n");

    FILE *poFile = fopen("po.dat", "r");
    if (poFile) {
        double sumS = 0.0, sumE = 0.0;
        double maxS = -1e9, minS = 1e9;
        double maxE = -1e9, minE = 1e9;
        int count = 0;
        char line[256];

        // Pular cabecalho
        if (fgets(line, sizeof(line), poFile) == nullptr) {
            fclose(poFile);
            printf("Arquivo po.dat vazio ou erro na leitura\n");
            return;
        }

        // Ler dados linha a linha
        double T, S, varS, E, varE;
        while (fgets(line, sizeof(line), poFile) != nullptr) {
            if (sscanf(line, "%lf %lf %lf %lf %lf", &T, &S, &varS, &E, &varE) == 5) {
                sumS += S;
                sumE += E;

                if (S > maxS) maxS = S;
                if (S < minS) minS = S;
                if (E > maxE) maxE = E;
                if (E < minE) minE = E;

                count++;
            }
        }
        fclose(poFile);

        if (count > 0) {
            printf("Parametro de Ordem (S):\n");
            printf("  Media:  %.4f\n", sumS / count);
            printf("  Maximo: %.4f\n", maxS);
            printf("  Minimo: %.4f\n", minS);

            printf("\nEnergia (E):\n");
            printf("  Media:  %.4f\n", sumE / count);
            printf("  Maxima: %.4f\n", maxE);
            printf("  Minima: %.4f\n", minE);

            printf("\nEstatisticas:\n");
            printf("  Numero de passos salvos: %d\n", count);
        } else {
            printf("Nenhum dado valido encontrado em po.dat\n");
        }
    } else {
        printf("Arquivo po.dat nao encontrado\n");
    }

    printf("\nConfiguracao do Sistema:\n");
    printf("  Dimensoes: %dx%dx%d\n", params->Nx, params->Ny, params->Nz);
    printf("  Potencial: %s\n", params->potential);
    printf("  Geometria: %s\n", params->geometry);
    printf("  Condicoes de contorno: %s / %s / %s\n",
           params->XBoundtype, params->YBoundtype, params->ZBoundtype);

    printf("====================================\n\n");
}

int main(int argc, char **argv) {
  printf("### Starting McLiCS version: %s ###\n\n",MCLICS_VERSION);

  if (argc < 2) {
        printf("Erro: Arquivo de entrada nao especificado.\n");
        printf("Uso: %s <arquivo_de_parametros>\n", argv[0]);
        return 1;
  }

  cleanPreviousOutput();

  Parameters params = read_input_file(argv[1]);
  print_parameters(params);
  char fname[1000];
  simulator *sim = new simulator(&params);
  sim->Setup_simmulation(params);

  sprintf(fname, "ic.csv");
  sim->print_n(fname, &params);
  sim->evolve->run();

  printSimulationSummary(&params);

  delete sim;
  return 0;
}
