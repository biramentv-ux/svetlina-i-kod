/* Малка стекова виртуална машина: чете .prog файл и го изпълнява.
   Форматът: 4 байта магия "PV01", 1 байт брой инструкции, после двойки (opcode, операнд).
   Накрая 1 байт контролна сума (XOR на всички предходни байтове). */
#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>

enum { OP_PUSH=1, OP_ADD=2, OP_MUL=3, OP_SUB=4, OP_PRINT=5 };

static int run(const uint8_t *code, int n) {
    int stack[64]; int sp = 0;
    for (int i = 0; i < n; i++) {
        uint8_t op = code[i*2], arg = code[i*2+1];
        switch (op) {
            case OP_PUSH: stack[sp++] = arg; break;
            case OP_ADD:  stack[sp-2] = stack[sp-2] + stack[sp-1]; sp--; break;
            case OP_MUL:  stack[sp-2] = stack[sp-2] * stack[sp-1]; sp--; break;
            case OP_SUB:  stack[sp-2] = stack[sp-2] - stack[sp-1]; sp--; break;
            case OP_PRINT: printf("%d\n", stack[sp-1]); break;
            default: fprintf(stderr, "лоша инструкция %d\n", op); return 1;
        }
    }
    return 0;
}

int main(int argc, char **argv) {
    if (argc < 2) { fprintf(stderr, "ползване: %s файл.prog\n", argv[0]); return 2; }
    FILE *f = fopen(argv[1], "rb");
    if (!f) { perror("fopen"); return 2; }
    uint8_t buf[512]; size_t len = fread(buf, 1, sizeof buf, f); fclose(f);
    if (len < 6 || buf[0]!='P'||buf[1]!='V'||buf[2]!='0'||buf[3]!='1') {
        fprintf(stderr, "лоша магия\n"); return 1;
    }
    int n = buf[4];
    uint8_t chk = 0;
    for (size_t i = 0; i < len-1; i++) chk ^= buf[i];
    if (chk != buf[len-1]) { fprintf(stderr, "лоша контролна сума\n"); return 1; }
    return run(buf + 5, n);
}
