import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Populando categorias essenciais...')

  // ✅ ESSENCIAL: Categorias base do sistema
  console.log('📂 Criando categorias principais...')
  await prisma.category.createMany({
    data: [
      { id: 'cat-001', name: 'Camisas', level: 1, isLeaf: false },
      { id: 'cat-002', name: 'Calça', level: 1, isLeaf: false },
      { id: 'cat-003', name: 'Sapatos', level: 1, isLeaf: false },
      { id: 'cat-004', name: 'Acessórios', level: 1, isLeaf: false },
      { id: 'cat-005', name: 'Saia', level: 1, isLeaf: false },
      { id: 'cat-006', name: 'Vestido', level: 1, isLeaf: false },
      { id: 'cat-007', name: 'Shorts', level: 1, isLeaf: false },
      { id: 'cat-008', name: 'Biquíni', level: 1, isLeaf: false }, 
      { id: 'cat-009', name: 'Casacos', level: 1, isLeaf: false }
    ],
    skipDuplicates: true
  })

  console.log('📁 Criando subcategorias...')
  await prisma.category.createMany({
    data: [
      // Camisas
      { id: 'subcat-001', name: 'Camiseta', parentId: 'cat-001', level: 2, isLeaf: false },
      { id: 'subcat-002', name: 'Social', parentId: 'cat-001', level: 2, isLeaf: false },
      { id: 'subcat-003', name: 'Blusa', parentId: 'cat-001', level: 2, isLeaf: false },
      // Calças
      { id: 'subcat-004', name: 'Jeans', parentId: 'cat-002', level: 2, isLeaf: false },
      { id: 'subcat-005', name: 'Calça social', parentId: 'cat-002', level: 2, isLeaf: false },
      // Sapatos
      { id: 'subcat-006', name: 'Tennis', parentId: 'cat-003', level: 2, isLeaf: false },
      { id: 'subcat-007', name: 'Botas', parentId: 'cat-003', level: 2, isLeaf: false },
      { id: 'subcat-008', name: 'Salto alto', parentId: 'cat-003', level: 2, isLeaf: false },
      { id: 'subcat-009', name: 'Sapatilha', parentId: 'cat-003', level: 2, isLeaf: false },
      // Acessórios
      { id: 'subcat-010', name: 'Óculos', parentId: 'cat-004', level: 2, isLeaf: false },
      { id: 'subcat-011', name: 'Bolsas', parentId: 'cat-004', level: 2, isLeaf: false },
      { id: 'subcat-012', name: 'Bijuteria', parentId: 'cat-004', level: 2, isLeaf: false },
      { id: 'subcat-013', name: 'Chapéus', parentId: 'cat-004', level: 2, isLeaf: false },
      // Shorts
      { id: 'subcat-014', name: 'Casual', parentId: 'cat-007', level: 2, isLeaf: false },
      { id: 'subcat-015', name: 'Esportivo', parentId: 'cat-007', level: 2, isLeaf: false },
      // Casacos
      { id: 'subcat-016', name: 'Jaqueta', parentId: 'cat-009', level: 2, isLeaf: false },
      { id: 'subcat-017', name: 'Blazer', parentId: 'cat-009', level: 2, isLeaf: false }
    ],
    skipDuplicates: true
  })

  console.log('🎭 Criando especificações de gênero...')
  await prisma.category.createMany({
    data: [
      // Camisetas
      { id: 'subsubcat-001', name: 'Feminina', parentId: 'subcat-001', level: 3, isLeaf: true },
      { id: 'subsubcat-002', name: 'Masculina', parentId: 'subcat-001', level: 3, isLeaf: true },
      // Social
      { id: 'subsubcat-003', name: 'Feminina', parentId: 'subcat-002', level: 3, isLeaf: true },
      { id: 'subsubcat-004', name: 'Masculina', parentId: 'subcat-002', level: 3, isLeaf: true },
      // Blusas
      { id: 'subsubcat-005', name: 'Feminina', parentId: 'subcat-003', level: 3, isLeaf: true },
      { id: 'subsubcat-006', name: 'Masculina', parentId: 'subcat-003', level: 3, isLeaf: true },
      // Jeans
      { id: 'subsubcat-007', name: 'Feminina', parentId: 'subcat-004', level: 3, isLeaf: true },
      { id: 'subsubcat-008', name: 'Masculina', parentId: 'subcat-004', level: 3, isLeaf: true },
      // Calça social
      { id: 'subsubcat-009', name: 'Feminina', parentId: 'subcat-005', level: 3, isLeaf: true },
      { id: 'subsubcat-010', name: 'Masculina', parentId: 'subcat-005', level: 3, isLeaf: true },
      // Tennis
      { id: 'subsubcat-011', name: 'Feminina', parentId: 'subcat-006', level: 3, isLeaf: true },
      { id: 'subsubcat-012', name: 'Masculina', parentId: 'subcat-006', level: 3, isLeaf: true },
      // Botas
      { id: 'subsubcat-013', name: 'Feminina', parentId: 'subcat-007', level: 3, isLeaf: true },
      { id: 'subsubcat-014', name: 'Masculina', parentId: 'subcat-007', level: 3, isLeaf: true },
      // Salto alto
      { id: 'subsubcat-015', name: 'Feminina', parentId: 'subcat-008', level: 3, isLeaf: true },
      // Sapatilha
      { id: 'subsubcat-016', name: 'Feminina', parentId: 'subcat-009', level: 3, isLeaf: true },
      // Óculos
      { id: 'subsubcat-017', name: 'Feminina', parentId: 'subcat-010', level: 3, isLeaf: true },
      { id: 'subsubcat-018', name: 'Masculina', parentId: 'subcat-010', level: 3, isLeaf: true },
      // Bolsas
      { id: 'subsubcat-019', name: 'Feminina', parentId: 'subcat-011', level: 3, isLeaf: true },
      { id: 'subsubcat-020', name: 'Masculina', parentId: 'subcat-011', level: 3, isLeaf: true },
      // Bijuteria
      { id: 'subsubcat-021', name: 'Feminina', parentId: 'subcat-012', level: 3, isLeaf: true },
      { id: 'subsubcat-022', name: 'Masculina', parentId: 'subcat-012', level: 3, isLeaf: true },
      // Chapéus
      { id: 'subsubcat-023', name: 'Feminina', parentId: 'subcat-013', level: 3, isLeaf: true },
      { id: 'subsubcat-024', name: 'Masculina', parentId: 'subcat-013', level: 3, isLeaf: true },
      // Saia (categoria direta)
      { id: 'subsubcat-025', name: 'Feminina', parentId: 'cat-005', level: 2, isLeaf: true },
      // Vestido (categoria direta)
      { id: 'subsubcat-026', name: 'Feminina', parentId: 'cat-006', level: 2, isLeaf: true },
      // Shorts Casual
      { id: 'subsubcat-027', name: 'Feminina', parentId: 'subcat-014', level: 3, isLeaf: true },
      { id: 'subsubcat-028', name: 'Masculina', parentId: 'subcat-014', level: 3, isLeaf: true },
      // Shorts Esportivo
      { id: 'subsubcat-029', name: 'Feminina', parentId: 'subcat-015', level: 3, isLeaf: true },
      { id: 'subsubcat-030', name: 'Masculina', parentId: 'subcat-015', level: 3, isLeaf: true },
      // Biquíni (categoria direta)
      { id: 'subsubcat-031', name: 'Feminina', parentId: 'cat-008', level: 2, isLeaf: true },
      // Casacos Jaqueta
      { id: 'subsubcat-032', name: 'Feminina', parentId: 'subcat-016', level: 3, isLeaf: true },
      { id: 'subsubcat-033', name: 'Masculina', parentId: 'subcat-016', level: 3, isLeaf: true },
      // Casacos Blazer
      { id: 'subsubcat-034', name: 'Feminina', parentId: 'subcat-017', level: 3, isLeaf: true },
      { id: 'subsubcat-035', name: 'Masculina', parentId: 'subcat-017', level: 3, isLeaf: true },
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