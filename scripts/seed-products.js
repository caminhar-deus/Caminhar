import pkg from '@next/env';
const { loadEnvConfig } = pkg;
loadEnvConfig(process.cwd()); // Carrega as variáveis de ambiente (.env)

import { fakerPT_BR as faker } from '@faker-js/faker';

// Importa o banco dinamicamente após as variáveis de ambiente estarem prontas
const { query } = await import('../lib/db.js');

async function seedProducts() {
  console.log('🌱 Iniciando o seed de Produtos Religiosos...');
  
  try {
    const TOTAL_PRODUCTS = 30;
    
    for (let i = 0; i < TOTAL_PRODUCTS; i++) {
      // Dados gerados dinamicamente
      const title = faker.commerce.productName();
      const price = `R$ ${faker.commerce.price({ min: 20, max: 350, dec: 2 })}`;
      const description = faker.commerce.productDescription();
      
      // Gera de 1 a 3 imagens por produto simulando o nosso comportamento de Carrossel
      const numImages = faker.number.int({ min: 1, max: 3 });
      const imagesArray = Array.from({ length: numImages }).map(() => 
        faker.image.urlLoremFlickr({ category: 'books', width: 640, height: 480 })
      );
      const images = imagesArray.join('\n'); // Junta as URLs com quebra de linha
      
      // Simula a presença (70% de chance) ou não de botões de venda
      const link_ml = faker.datatype.boolean(0.7) ? `https://produto.mercadolivre.com.br/MLB-${faker.number.int({min: 1000000000, max: 9999999999})}` : '';
      const link_shopee = faker.datatype.boolean(0.7) ? `https://shopee.com.br/product/${faker.number.int()}/${faker.number.int()}` : '';
      const link_amazon = faker.datatype.boolean(0.7) ? `https://amazon.com.br/dp/${faker.string.alphanumeric(10).toUpperCase()}` : '';

      const sql = `
        INSERT INTO products (title, price, description, images, link_ml, link_shopee, link_amazon)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;
      
      await query(sql, [title, price, description, images, link_ml, link_shopee, link_amazon], { log: false });
      
      if ((i + 1) % 5 === 0) {
        console.log(`✅ ${i + 1}/${TOTAL_PRODUCTS} produtos inseridos...`);
      }
    }
    
    console.log('🎉 Seed de produtos concluído com sucesso! Verifique a interface.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro durante o seed de produtos:', error);
    process.exit(1);
  }
}

seedProducts();