import React, { useState } from 'react';
import Head from 'next/head';
import { Button, Input, TextArea, Select, Card, Modal, Spinner, Badge, Alert, Toast } from '../components/UI';
import { Container, Grid, Stack, Sidebar } from '../components/Layout';
import styles from '../styles/DesignSystem.module.css';

/**
 * Design System Demo Page
 * Página de demonstração do Design System completo
 */
export default function DesignSystem() {
  const [modalOpen, setModalOpen] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);

  const selectOptions = [
    { value: '1', label: 'Opção 1' },
    { value: '2', label: 'Opção 2' },
    { value: '3', label: 'Opção 3', disabled: true },
  ];

  return (
    <>
      <Head>
        <title>Design System | O Caminhar com Deus</title>
        <meta name="description" content="Design System do site O Caminhar com Deus" />
      </Head>

      <div className={styles.page}>
        {/* Header */}
        <header className={styles.header}>
          <Container>
            <Stack direction="horizontal" justify="between" align="center">
              <h1 className={styles.logo}>O Caminhar com Deus</h1>
              <Badge variant="secondary" size="sm">Design System v1.0</Badge>
            </Stack>
          </Container>
        </header>

        <Container className={styles.main}>
          <Stack spacing="2xl">
            {/* Introdução */}
            <section>
              <h2 className={styles.sectionTitle}>Design System Foundation</h2>
              <p className={styles.sectionDescription}>
                Sistema de design completo para o site O Caminhar com Deus.
                Inclui tokens, componentes base e padrões visuais consistentes.
              </p>
            </section>

            {/* Cores */}
            <section className={styles.section}>
              <h3 className={styles.subsectionTitle}>🎨 Paleta de Cores</h3>
              <Stack spacing="lg">
                <div>
                  <h4 className={styles.paletteLabel}>Primária (Azul Serenidade)</h4>
                  <div className={styles.colorRow}>
                    <div className={`${styles.colorBox} ${styles.primary50}`}>50</div>
                    <div className={`${styles.colorBox} ${styles.primary100}`}>100</div>
                    <div className={`${styles.colorBox} ${styles.primary200}`}>200</div>
                    <div className={`${styles.colorBox} ${styles.primary500}`}>500</div>
                    <div className={`${styles.colorBox} ${styles.primary700}`}>700</div>
                    <div className={`${styles.colorBox} ${styles.primary900}`}>900</div>
                  </div>
                </div>

                <div>
                  <h4 className={styles.paletteLabel}>Secundária (Dourado Luz)</h4>
                  <div className={styles.colorRow}>
                    <div className={`${styles.colorBox} ${styles.secondary50}`}>50</div>
                    <div className={`${styles.colorBox} ${styles.secondary200}`}>200</div>
                    <div className={`${styles.colorBox} ${styles.secondary500}`}>500</div>
                    <div className={`${styles.colorBox} ${styles.secondary700}`}>700</div>
                  </div>
                </div>

                <div>
                  <h4 className={styles.paletteLabel}>Feedback</h4>
                  <div className={styles.colorRow}>
                    <div className={`${styles.colorBox} ${styles.success}`}>Sucesso</div>
                    <div className={`${styles.colorBox} ${styles.error}`}>Erro</div>
                    <div className={`${styles.colorBox} ${styles.warning}`}>Aviso</div>
                    <div className={`${styles.colorBox} ${styles.info}`}>Info</div>
                  </div>
                </div>
              </Stack>
            </section>

            {/* Botões */}
            <section className={styles.section}>
              <h3 className={styles.subsectionTitle}>🔘 Botões</h3>
              
              <div className={styles.componentGroup}>
                <h4 className={styles.groupLabel}>Variantes</h4>
                <Stack direction="horizontal" wrap spacing="sm">
                  <Button variant="primary">Primário</Button>
                  <Button variant="secondary">Secundário</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="danger">Danger</Button>
                  <Button variant="success">Success</Button>
                  <Button variant="warning">Warning</Button>
                </Stack>
              </div>

              <div className={styles.componentGroup}>
                <h4 className={styles.groupLabel}>Tamanhos</h4>
                <Stack direction="horizontal" wrap spacing="sm" align="center">
                  <Button size="sm">Small</Button>
                  <Button size="md">Medium</Button>
                  <Button size="lg">Large</Button>
                  <Button size="xl">Extra Large</Button>
                </Stack>
              </div>

              <div className={styles.componentGroup}>
                <h4 className={styles.groupLabel}>Estados</h4>
                <Stack direction="horizontal" wrap spacing="sm">
                  <Button loading>Loading</Button>
                  <Button disabled>Disabled</Button>
                  <Button fullWidth>Full Width</Button>
                </Stack>
              </div>
            </section>

            {/* Inputs */}
            <section className={styles.section}>
              <h3 className={styles.subsectionTitle}>📝 Inputs</h3>
              <Grid columns={2} gap="lg">
                <Input label="Nome completo" placeholder="Digite seu nome" />
                <Input label="Email" type="email" placeholder="seu@email.com" />
                <Input 
                  label="Senha" 
                  type="password" 
                  placeholder="••••••"
                  error
                  errorMessage="Senha muito curta"
                />
                <Input 
                  label="Com ícone"
                  leftAddon={<span>🔍</span>}
                  placeholder="Buscar..."
                />
              </Grid>

              <div className={styles.componentGroup}>
                <Select 
                  label="Selecione uma opção"
                  options={selectOptions}
                  placeholder="Escolha..."
                />
              </div>

              <div className={styles.componentGroup}>
                <TextArea 
                  label="Mensagem"
                  placeholder="Digite sua mensagem..."
                  rows={4}
                  maxLength={200}
                  showCount
                />
              </div>
            </section>

            {/* Cards */}
            <section className={styles.section}>
              <h3 className={styles.subsectionTitle}>🃏 Cards</h3>
              <Grid columns={3} gap="md">
                <Card variant="default">
                  <h4>Card Padrão</h4>
                  <p>Card com sombra padrão para uso geral.</p>
                </Card>

                <Card variant="elevated">
                  <h4>Card Elevado</h4>
                  <p>Com sombra mais pronunciada para destaque.</p>
                </Card>

                <Card variant="outlined">
                  <h4>Card Outlined</h4>
                  <p>Com borda para contextos limpos.</p>
                </Card>

                <Card hoverable clickable>
                  <h4>Card Interativo</h4>
                  <p>Hoverable e clickable para interação.</p>
                </Card>

                <Card 
                  header={<Card.Header title="Com Header" subtitle="Subtítulo aqui" />}
                  footer={<Card.Footer align="end"><Button size="sm">Ação</Button></Card.Footer>}
                >
                  <p>Card completo com header e footer.</p>
                </Card>

                <Card media="https://via.placeholder.com/400x200/2563eb/ffffff?text=Imagem">
                  <h4>Card com Imagem</h4>
                  <p>Card com mídia no topo.</p>
                </Card>
              </Grid>
            </section>

            {/* Badges */}
            <section className={styles.section}>
              <h3 className={styles.subsectionTitle}>🏷️ Badges</h3>
              <Stack direction="horizontal" wrap spacing="sm" align="center">
                <Badge>Default</Badge>
                <Badge variant="primary">Primary</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="success">Success</Badge>
                <Badge variant="error">Error</Badge>
                <Badge variant="warning">Warning</Badge>
                <Badge variant="info">Info</Badge>
                <Badge.Counter count={150} max={99} />
                <Badge.Dot pulse />
              </Stack>
            </section>

            {/* Alerts */}
            <section className={styles.section}>
              <h3 className={styles.subsectionTitle}>⚠️ Alerts</h3>
              <Stack spacing="md">
                <Alert status="info" title="Informação">
                  Esta é uma mensagem informativa para o usuário.
                </Alert>
                <Alert status="success" title="Sucesso!" closable>
                  Operação realizada com sucesso.
                </Alert>
                <Alert status="warning" title="Atenção" variant="leftAccent">
                  Verifique os dados antes de continuar.
                </Alert>
                <Alert status="error" title="Erro" variant="solid">
                  Algo deu errado. Tente novamente.
                </Alert>
              </Stack>
            </section>

            {/* Spinners */}
            <section className={styles.section}>
              <h3 className={styles.subsectionTitle}>⏳ Spinners</h3>
              <Stack direction="horizontal" wrap spacing="lg" align="center">
                <Spinner size="sm" />
                <Spinner size="md" />
                <Spinner size="lg" />
                <Spinner size="xl" variant="grow" />
                <Spinner size="md" variant="dots" />
                <Spinner.Container>
                  <Spinner size="xl" />
                  <p>Carregando...</p>
                </Spinner.Container>
              </Stack>
            </section>

            {/* Modal Demo */}
            <section className={styles.section}>
              <h3 className={styles.subsectionTitle}>🪟 Modal</h3>
              <Button onClick={() => setModalOpen(true)}>Abrir Modal</Button>
            </section>

            {/* Toast Demo */}
            <section className={styles.section}>
              <h3 className={styles.subsectionTitle}>🍞 Toast</h3>
              <Stack direction="horizontal" wrap spacing="sm">
                <Button variant="success" onClick={() => setToastVisible(true)}>
                  Mostrar Toast
                </Button>
              </Stack>
              <Toast
                isOpen={toastVisible}
                status="success"
                title="Sucesso!"
                description="Esta é uma notificação de sucesso."
                onClose={() => setToastVisible(false)}
              />
            </section>

            {/* Layout Components */}
            <section className={styles.section}>
              <h3 className={styles.subsectionTitle}>📐 Layout</h3>
              
              <div className={styles.componentGroup}>
                <h4 className={styles.groupLabel}>Stack Vertical</h4>
                <Stack spacing="md" className={styles.demoStack}>
                  <div className={styles.demoBox}>Item 1</div>
                  <div className={styles.demoBox}>Item 2</div>
                  <div className={styles.demoBox}>Item 3</div>
                </Stack>
              </div>

              <div className={styles.componentGroup}>
                <h4 className={styles.groupLabel}>Stack Horizontal</h4>
                <Stack direction="horizontal" spacing="md" className={styles.demoStack}>
                  <div className={styles.demoBox}>Item 1</div>
                  <div className={styles.demoBox}>Item 2</div>
                  <div className={styles.demoBox}>Item 3</div>
                </Stack>
              </div>

              <div className={styles.componentGroup}>
                <h4 className={styles.groupLabel}>Grid Responsivo</h4>
                <Grid.Responsive columns={{ default: 1, sm: 2, md: 3, lg: 4 }} gap="md">
                  <div className={styles.demoBox}>1</div>
                  <div className={styles.demoBox}>2</div>
                  <div className={styles.demoBox}>3</div>
                  <div className={styles.demoBox}>4</div>
                </Grid.Responsive>
              </div>
            </section>

            {/* Documentação */}
            <section className={styles.section}>
              <h3 className={styles.subsectionTitle}>📚 Documentação</h3>
              <Card>
                <Stack spacing="md">
                  <p>O Design System inclui:</p>
                  <ul className={styles.docList}>
                    <li><strong>Tokens:</strong> Cores, spacing, tipografia, bordas, sombras, breakpoints, animações</li>
                    <li><strong>Componentes UI:</strong> Button, Input, TextArea, Select, Card, Modal, Spinner, Badge, Alert, Toast</li>
                    <li><strong>Layout:</strong> Container, Grid, Stack, Sidebar</li>
                    <li><strong>Hooks:</strong> useTheme para acesso aos tokens</li>
                  </ul>
                  <Stack direction="horizontal" spacing="sm">
                    <Button variant="primary">Ver Documentação</Button>
                    <Button variant="secondary">GitHub</Button>
                  </Stack>
                </Stack>
              </Card>
            </section>
          </Stack>
        </Container>

        {/* Footer */}
        <footer className={styles.footer}>
          <Container>
            <p>© 2025 O Caminhar com Deus - Design System</p>
          </Container>
        </footer>

        {/* Modal */}
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Exemplo de Modal"
          footer={
            <Stack direction="horizontal" spacing="sm" justify="end">
              <Button variant="ghost" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={() => setModalOpen(false)}>
                Confirmar
              </Button>
            </Stack>
          }
        >
          <p>Este é um exemplo de modal usando o Design System.</p>
          <p>Ele inclui todas as funcionalidades esperadas:</p>
          <ul>
            <li>Fechamento com ESC</li>
            <li>Fechamento ao clicar no overlay</li>
            <li>Transições suaves</li>
            <li>Acessibilidade (aria labels)</li>
          </ul>
        </Modal>
      </div>
    </>
  );
}
