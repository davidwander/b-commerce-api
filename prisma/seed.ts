
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Populando categorias essenciais...')

  // ✅ ESSENCIAL: Categorias base do sistema
  console.log('📂 Criando categorias principais...')
  await prisma.category.createMany({
    data: [
      { id: 'cat-001', name: 'Camisas', level: 1 },
      { id: 'cat-002', name: 'Calça', level: 1 },
      { id: 'cat-003', name: 'Sapatos', level: 1 },
      { id: 'cat-004', name: 'Acessórios', level: 1 },
      { id: 'cat-005', name: 'Saia', level: 1 },
      { id: 'cat-006', name: 'Vestido', level: 1 },
      { id: 'cat-007', name: 'Shorts', level: 1 },
      { id: 'cat-008', name: 'Bequine', level: 1 },
      { id: 'cat-009', name: 'Casacos', level: 1 }
    ],
    skipDuplicates: true
  })

  console.log('📁 Criando subcategorias...')
  await prisma.category.createMany({
    data: [
      // Camisas
      { id: 'subcat-001', name: 'Camiseta', parentId: 'cat-001', level: 2 },
      { id: 'subcat-002', name: 'Social', parentId: 'cat-001', level: 2 },
      { id: 'subcat-003', name: 'Blusa', parentId: 'cat-001', level: 2 },
      // Calças
      { id: 'subcat-004', name: 'Jeans', parentId: 'cat-002', level: 2 },
      { id: 'subcat-005', name: 'Calça social', parentId: 'cat-002', level: 2 },
      // Sapatos
      { id: 'subcat-006', name: 'Tennis', parentId: 'cat-003', level: 2 },
      { id: 'subcat-007', name: 'Botas', parentId: 'cat-003', level: 2 },
      { id: 'subcat-008', name: 'Salto alto', parentId: 'cat-003', level: 2 },
      { id: 'subcat-009', name: 'Sapatilha', parentId: 'cat-003', level: 2 },
      // Acessórios
      { id: 'subcat-010', name: 'Óculos', parentId: 'cat-004', level: 2 },
      { id: 'subcat-011', name: 'Bolsas', parentId: 'cat-004', level: 2 },
      { id: 'subcat-012', name: 'Bijuteria', parentId: 'cat-004', level: 2 },
      { id: 'subcat-013', name: 'Chapéus', parentId: 'cat-004', level: 2 },
      // Shorts
      { id: 'subcat-014', name: 'Feminina', parentId: 'cat-007', level: 2 },
      { id: 'subcat-015', name: 'Masculina', parentId: 'cat-007', level: 2 },
      // Casacos
      { id: 'subcat-016', name: 'Feminina', parentId: 'cat-009', level: 2 },
      { id: 'subcat-017', name: 'Masculina', parentId: 'cat-009', level: 2 }
    ],
    skipDuplicates: true
  })

  console.log('🎭 Criando especificações de gênero...')
  await prisma.category.createMany({
    data: [
      // Camisetas
      { id: 'subsubcat-001', name: 'Feminina', parentId: 'subcat-001', level: 3 },
      { id: 'subsubcat-002', name: 'Masculina', parentId: 'subcat-001', level: 3 },
      // Social
      { id: 'subsubcat-003', name: 'Feminina', parentId: 'subcat-002', level: 3 },
      { id: 'subsubcat-004', name: 'Masculina', parentId: 'subcat-002', level: 3 },
      // Blusas
      { id: 'subsubcat-005', name: 'Feminina', parentId: 'subcat-003', level: 3 },
      { id: 'subsubcat-006', name: 'Masculina', parentId: 'subcat-003', level: 3 },
      // Jeans
      { id: 'subsubcat-007', name: 'Feminina', parentId: 'subcat-004', level: 3 },
      { id: 'subsubcat-008', name: 'Masculina', parentId: 'subcat-004', level: 3 },
      // Calça social
      { id: 'subsubcat-009', name: 'Feminina', parentId: 'subcat-005', level: 3 },
      { id: 'subsubcat-010', name: 'Masculina', parentId: 'subcat-005', level: 3 },
      // Tennis
      { id: 'subsubcat-011', name: 'Feminina', parentId: 'subcat-006', level: 3 },
      { id: 'subsubcat-012', name: 'Masculina', parentId: 'subcat-006', level: 3 },
      // Botas
      { id: 'subsubcat-013', name: 'Feminina', parentId: 'subcat-007', level: 3 },
      { id: 'subsubcat-014', name: 'Masculina', parentId: 'subcat-007', level: 3 },
      // Salto alto
      { id: 'subsubcat-015', name: 'Feminina', parentId: 'subcat-008', level: 3 },
      // Sapatilha
      { id: 'subsubcat-016', name: 'Feminina', parentId: 'subcat-009', level: 3 },
      // Óculos
      { id: 'subsubcat-017', name: 'Feminina', parentId: 'subcat-010', level: 3 },
      { id: 'subsubcat-018', name: 'Masculina', parentId: 'subcat-010', level: 3 },
      // Bolsas
      { id: 'subsubcat-019', name: 'Feminina', parentId: 'subcat-011', level: 3 },
      { id: 'subsubcat-020', name: 'Masculina', parentId: 'subcat-011', level: 3 },
      // Bijuteria
      { id: 'subsubcat-021', name: 'Feminina', parentId: 'subcat-012', level: 3 },
      { id: 'subsubcat-022', name: 'Masculina', parentId: 'subcat-012', level: 3 },
      // Chapéus
      { id: 'subsubcat-023', name: 'Feminina', parentId: 'subcat-013', level: 3 },
      { id: 'subsubcat-024', name: 'Masculina', parentId: 'subcat-013', level: 3 },
      // Saia
      { id: 'subsubcat-025', name: 'Feminina', parentId: 'cat-005', level: 2 }, // Corrigido level para 2, parentId para cat-005
      // Vestido
      { id: 'subsubcat-026', name: 'Feminina', parentId: 'cat-006', level: 2 }, // Corrigido level para 2, parentId para cat-006
      // Shorts Casual
      { id: 'subsubcat-027', name: 'Feminina', parentId: 'subcat-014', level: 3 },
      { id: 'subsubcat-028', name: 'Masculina', parentId: 'subcat-014', level: 3 },
      // Shorts Esportivo
      { id: 'subsubcat-029', name: 'Feminina', parentId: 'subcat-015', level: 3 },
      { id: 'subsubcat-030', name: 'Masculina', parentId: 'subcat-015', level: 3 },
      // Biquíni
      { id: 'subsubcat-031', name: 'Feminina', parentId: 'cat-008', level: 2 }, // Corrigido level para 2, parentId para cat-008
      // Casacos Jaqueta
      { id: 'subsubcat-032', name: 'Feminina', parentId: 'subcat-016', level: 3 },
      { id: 'subsubcat-033', name: 'Masculina', parentId: 'subcat-016', level: 3 },
      // Casacos Blazer
      { id: 'subsubcat-034', name: 'Feminina', parentId: 'subcat-017', level: 3 },
      { id: 'subsubcat-035', name: 'Masculina', parentId: 'subcat-017', level: 3 },
    ],
    skipDuplicates: true
  })

  console.log('✅ Estrutura de categorias criada com sucesso!')
  console.log('📊 Agora você pode adicionar peças através da API!')
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })