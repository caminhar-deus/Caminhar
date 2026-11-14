import React, { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Button } from '@/components/UI';
import { AppIcon } from '@/components/UI/icons';
import {
  getPaymentFeedback,
  formatCpfCnpj,
  isValidCpfCnpjDigits,
} from '../../lib/payment/payment-status-messages.js';
import styles from '../styles/CustomerPages.module.css';

function getMpPublicKey() {
  return process.env.NEXT_PUBLIC_MP_PUBLIC_KEY || '';
}

const MIN_PAYMENT_METHOD_AMOUNTS = {
  pix: 0.01,
  credit_card: 0.5,
  debit_card: 0.5,
  ticket: 4.0,
};

let mpSdkLoaderPromise = null;
let mpSdkInstance = null;
let mpSdkInstanceKey = '';
let mpSdkConstructorRef = null;

function loadMercadoPagoSdk() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Mercado Pago SDK disponível apenas no navegador.'));
  }
  if (window.MercadoPago) {
    return Promise.resolve(window.MercadoPago);
  }
  if (!mpSdkLoaderPromise) {
    mpSdkLoaderPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-mp-sdk="v2"]');
      if (existing) {
        existing.addEventListener('load', () => resolve(window.MercadoPago));
        existing.addEventListener('error', () => {
          mpSdkLoaderPromise = null;
          reject(new Error('Falha ao carregar o SDK do Mercado Pago.'));
        });
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://sdk.mercadopago.com/js/v2';
      script.async = true;
      script.dataset.mpSdk = 'v2';
      script.onload = () => {
        if (window.MercadoPago) resolve(window.MercadoPago);
        else {
          mpSdkLoaderPromise = null;
          reject(new Error('SDK do Mercado Pago não inicializou corretamente.'));
        }
      };
      script.onerror = () => {
        mpSdkLoaderPromise = null;
        reject(new Error('Não foi possível carregar o SDK do Mercado Pago.'));
      };
      document.head.appendChild(script);
    });
  }
  return mpSdkLoaderPromise;
}

async function getMercadoPagoInstance(publicKey) {
  const MercadoPago = await loadMercadoPagoSdk();
  if (
    !mpSdkInstance ||
    mpSdkInstanceKey !== publicKey ||
    mpSdkConstructorRef !== MercadoPago
  ) {
    mpSdkInstance = new MercadoPago(publicKey, {
      locale: 'pt-BR',
      trackingDisabled: true,
    });
    mpSdkInstanceKey = publicKey;
    mpSdkConstructorRef = MercadoPago;
  }
  return mpSdkInstance;
}

const MP_CARD_ERROR_CODE_MESSAGES = {
  '205': 'Número do cartão inválido. Confira os dígitos informados.',
  E301: 'Número do cartão inválido. Confira os dígitos informados.',
  '208': 'Mês de validade do cartão inválido.',
  '209': 'Ano de validade do cartão inválido.',
  '325': 'Mês de validade do cartão inválido.',
  '326': 'Ano de validade do cartão inválido.',
  '224': 'Código de segurança (CVV) inválido.',
  E302: 'Código de segurança (CVV) inválido.',
  '212': 'Tipo de documento (CPF/CNPJ) inválido.',
  '214': 'Informe o CPF ou CNPJ do titular do cartão.',
  '322': 'Tipo de documento (CPF/CNPJ) inválido.',
  '324': 'CPF ou CNPJ do titular recusado pelo Mercado Pago. Confira os dígitos informados.',
  '221': 'Informe o nome impresso no cartão.',
  '316': 'Nome impresso no cartão inválido.',
};

function extractCheckoutErrorMessage(err) {
  if (!err) {
    return 'Falha de comunicação ao processar o pagamento. Tente novamente.';
  }
  if (typeof err === 'string') {
    if (err.includes('SSL certificate is required')) {
      return 'Para pagamentos com cartão em ambiente de testes sem HTTPS, acesse via http://localhost:3000 (ou utilize conexão segura HTTPS).';
    }
    return err;
  }
  if (Array.isArray(err) && err.length > 0) {
    const first = err[0];
    const code = String(first?.code || '').trim();
    if (code && MP_CARD_ERROR_CODE_MESSAGES[code]) {
      return MP_CARD_ERROR_CODE_MESSAGES[code];
    }
    return (
      first?.description ||
      first?.message ||
      'Os dados do cartão foram recusados na validação do Mercado Pago. Confira os campos informados.'
    );
  }
  if (typeof err === 'object') {
    if (Array.isArray(err.cause) && err.cause.length > 0) {
      return extractCheckoutErrorMessage(err.cause);
    }
    if (typeof err.message === 'string' && err.message.trim()) {
      return extractCheckoutErrorMessage(err.message);
    }
  }
  return 'Falha de comunicação ao processar o pagamento. Tente novamente.';
}

async function tokenizeCardWithMercadoPago(mp, publicKey, cardPayload) {
  try {
    return await mp.createCardToken(cardPayload);
  } catch (sdkErr) {
    const rawMsg = typeof sdkErr === 'string' ? sdkErr : String(sdkErr?.message || '');
    const isHttpProtocol =
      typeof window !== 'undefined' && window.location?.protocol === 'http:';

    if (rawMsg.includes('SSL certificate is required') && isHttpProtocol && publicKey) {
      const tokenUrl = `https://api.mercadopago.com/v1/card_tokens?public_key=${encodeURIComponent(publicKey)}`;
      const tokenRes = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          card_number: cardPayload.cardNumber,
          expiration_month: parseInt(cardPayload.cardExpirationMonth, 10),
          expiration_year: parseInt(cardPayload.cardExpirationYear, 10),
          security_code: cardPayload.securityCode,
          cardholder: {
            name: cardPayload.cardholderName,
            identification: {
              type: cardPayload.identificationType,
              number: cardPayload.identificationNumber,
            },
          },
        }),
      });
      const tokenJson = await tokenRes.json().catch(() => ({}));
      if (!tokenRes.ok || !tokenJson?.id) {
        throw tokenJson?.cause || tokenJson?.message || sdkErr;
      }
      return tokenJson;
    }
    throw sdkErr;
  }
}

function formatCardNumberInput(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 19);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
}

function formatExpiryInput(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function parseCardExpiry(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length !== 4 && digits.length !== 6) return null;
  const month = parseInt(digits.slice(0, 2), 10);
  const rawYear = digits.slice(2);
  const yearNum = rawYear.length === 2 ? 2000 + parseInt(rawYear, 10) : parseInt(rawYear, 10);
  if (Number.isNaN(month) || month < 1 || month > 12 || Number.isNaN(yearNum)) return null;
  const now = new Date();
  if (yearNum < now.getFullYear()) return null;
  if (yearNum === now.getFullYear() && month < now.getMonth() + 1) return null;
  return {
    month: String(month).padStart(2, '0'),
    year: String(yearNum),
  };
}

const PAYMENT_METHODS = [
  { id: 'pix', label: 'PIX (aprovação imediata)', icon: 'zap' },
  { id: 'credit_card', label: 'Cartão de crédito', icon: 'creditCard' },
  { id: 'debit_card', label: 'Cartão de débito', icon: 'creditCard' },
  { id: 'ticket', label: 'Boleto bancário', icon: 'fileText' },
];

function formatBrl(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));
}

function estimateShipping(product, quantity) {
  if (!product || product.shipping_type === 'free') return 0;
  const base = Number(product.shipping_cost || 0);
  if (product.shipping_type === 'fixed') return base;
  if (product.shipping_type === 'calculated') {
    const start = base > 0 ? base : 19.9;
    return Number((start + Math.max(0, Number(quantity || 1) - 1) * 4.5).toFixed(2));
  }
  return 0;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { id } = router?.query || {};

  const [customer, setCustomer] = useState(null);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [quantity, setQuantity] = useState(1);
  const [cep, setCep] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [stateUf, setStateUf] = useState('');

  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [payerDocument, setPayerDocument] = useState('');
  const [cardHolderName, setCardHolderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardSecurityCode, setCardSecurityCode] = useState('');
  const [installments, setInstallments] = useState('1');
  const [detectedCardMethod, setDetectedCardMethod] = useState(null);
  const [installmentOptions, setInstallmentOptions] = useState([
    { installments: 1, recommended_message: '1x sem juros' },
    { installments: 2, recommended_message: '2x sem juros' },
    { installments: 3, recommended_message: '3x sem juros' },
  ]);
  const [copiedField, setCopiedField] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [completedOrder, setCompletedOrder] = useState(null);

  useEffect(() => {
    if (!router.isReady || !id) return;

    let active = true;
    async function loadCheckoutContext() {
      setLoading(true);
      setError('');
      try {
        const authRes = await fetch('/api/customer/auth');
        const authData = await authRes.json();
        if (!authRes.ok || !authData.authenticated) {
          router.replace(`/entrar?next=${encodeURIComponent(`/checkout/${id}`)}`);
          return;
        }
        if (!active) return;
        setCustomer(authData.customer);

        const defaultAddr = authData.customer?.default_address;
        if (defaultAddr) {
          setCep(defaultAddr.cep || '');
          setStreet(defaultAddr.street || '');
          setNumber(defaultAddr.number || '');
          setComplement(defaultAddr.complement || '');
          setNeighborhood(defaultAddr.neighborhood || '');
          setCity(defaultAddr.city || '');
          setStateUf(defaultAddr.state || '');
        }

        const prodRes = await fetch(`/api/checkout?productId=${encodeURIComponent(id)}`);
        const prodData = await prodRes.json().catch(() => ({}));
        if (!prodRes.ok || !prodData.product) {
          setError(prodData.message || 'Produto indisponível para compra direta.');
          setLoading(false);
          return;
        }
        if (active) {
          setProduct(prodData.product);
        }
      } catch {
        if (active) {
          setError('Erro de conexão ao carregar o checkout.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadCheckoutContext();
    return () => {
      active = false;
    };
  }, [id, router, router.isReady]);

  const shippingValue = useMemo(() => estimateShipping(product, quantity), [product, quantity]);
  const subtotalValue = useMemo(() => Number(product?.price || 0) * Number(quantity || 1), [product, quantity]);
  const totalValue = useMemo(() => subtotalValue + shippingValue, [subtotalValue, shippingValue]);
  const cardBin = useMemo(() => {
    const digits = cardNumber.replace(/\D/g, '');
    return digits.length >= 6 ? digits.slice(0, 6) : '';
  }, [cardNumber]);

  useEffect(() => {
    const isCard = paymentMethod === 'credit_card' || paymentMethod === 'debit_card';
    const mpPublicKey = getMpPublicKey();
    if (!isCard || !mpPublicKey || !cardBin) {
      setDetectedCardMethod(null);
      return undefined;
    }

    let active = true;

    async function detectBinDetails() {
      try {
        const mp = await getMercadoPagoInstance(mpPublicKey);
        if (!active) return;
        const pmResponse = await mp.getPaymentMethods({ bin: cardBin });
        const results = pmResponse?.results || [];
        if (!active || results.length === 0) return;

        const desiredType = paymentMethod === 'debit_card' ? 'debit_card' : 'credit_card';
        const exactMatch = results.find((r) => r.payment_type_id === desiredType);
        const fallbackPrepaid =
          paymentMethod === 'debit_card'
            ? results.find((r) => r.payment_type_id === 'prepaid_card')
            : null;
        const chosen = exactMatch || fallbackPrepaid || results[0];

        setDetectedCardMethod({
          id: chosen.id,
          name: chosen.name,
          paymentTypeId: chosen.payment_type_id,
          issuerId: chosen.issuer?.id || null,
          typeMismatch: Boolean(desiredType && chosen.payment_type_id !== desiredType),
        });

        if (
          paymentMethod === 'credit_card' &&
          totalValue >= MIN_PAYMENT_METHOD_AMOUNTS.credit_card &&
          typeof mp.getInstallments === 'function'
        ) {
          try {
            const instResult = await mp.getInstallments({
              amount: String(totalValue.toFixed(2)),
              bin: cardBin,
              paymentTypeId: chosen.payment_type_id || 'credit_card',
            });
            const costs = instResult?.[0]?.payer_costs;
            if (active && Array.isArray(costs) && costs.length > 0) {
              setInstallmentOptions(
                costs.slice(0, 12).map((c) => ({
                  installments: c.installments,
                  recommended_message: c.recommended_message || `${c.installments}x`,
                }))
              );
            }
          } catch {
            // Mantém opções padrão de parcelamento se consulta falhar
          }
        }
      } catch {
        // Ignora erro silencioso de detecção de BIN até o envio
      }
    }

    detectBinDetails();
    return () => {
      active = false;
    };
  }, [cardBin, paymentMethod, totalValue]);

  const handleCopyText = async (key, text) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setCopiedField(key);
        setTimeout(() => setCopiedField(''), 2500);
      }
    } catch {
      setCopiedField('');
    }
  };

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    if (!product) return;

    setError('');
    if (
      cep.replace(/\D/g, '').length < 8 ||
      stateUf.trim().length !== 2 ||
      street.trim().length < 2 ||
      !number.trim() ||
      neighborhood.trim().length < 2 ||
      city.trim().length < 2
    ) {
      setError('Preencha todos os campos obrigatórios do endereço de entrega (CEP, UF, rua, número, bairro e cidade).');
      return;
    }

    const docDigits = payerDocument.replace(/\D/g, '');
    if (!isValidCpfCnpjDigits(docDigits)) {
      setError('Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido para emitir a cobrança.');
      return;
    }

    const minAmount = MIN_PAYMENT_METHOD_AMOUNTS[paymentMethod] || 0.01;
    if (totalValue < minAmount) {
      const methodLabel =
        paymentMethod === 'ticket'
          ? 'Boleto Bancário'
          : paymentMethod === 'debit_card'
          ? 'Cartão de Débito'
          : 'Cartão de Crédito';
      setError(
        `O valor total do pedido (${formatBrl(totalValue)}) é inferior ao mínimo exigido pelo Mercado Pago para ${methodLabel} (${formatBrl(minAmount)}). Selecione PIX (mínimo de R$ 0,01) ou aumente a quantidade/valor do produto.`
      );
      return;
    }

    const isCard = paymentMethod === 'credit_card' || paymentMethod === 'debit_card';
    const cardDigits = cardNumber.replace(/\D/g, '');
    const parsedExpiry = isCard ? parseCardExpiry(cardExpiry) : null;
    const cvvDigits = cardSecurityCode.replace(/\D/g, '');

    if (isCard) {
      if (!cardHolderName.trim()) {
        setError('Informe o nome impresso no cartão.');
        return;
      }
      if (cardDigits.length < 13 || cardDigits.length > 19) {
        setError('Número do cartão inválido. Confira os dígitos informados.');
        return;
      }
      if (!parsedExpiry) {
        setError('Validade do cartão inválida ou expirada (use MM/AA).');
        return;
      }
      if (cvvDigits.length < 3 || cvvDigits.length > 4) {
        setError('Código de segurança (CVV) inválido.');
        return;
      }
    }

    setSubmitting(true);
    try {
      let paymentDetails = {
        payerDocument: docDigits,
      };

      if (isCard) {
        const mpPublicKey = getMpPublicKey();
        if (mpPublicKey) {
          const mp = await getMercadoPagoInstance(mpPublicKey);

          let methodId = detectedCardMethod?.id;
          let paymentTypeId = detectedCardMethod?.paymentTypeId;
          let issuerId = detectedCardMethod?.issuerId;
          if (!methodId) {
            const pmResponse = await mp.getPaymentMethods({ bin: cardDigits.slice(0, 6) });
            const results = pmResponse?.results || [];
            const desiredType = paymentMethod === 'debit_card' ? 'debit_card' : 'credit_card';
            const chosen =
              results.find((r) => r.payment_type_id === desiredType) ||
              (paymentMethod === 'debit_card'
                ? results.find((r) => r.payment_type_id === 'prepaid_card')
                : null) ||
              results[0];
            if (!chosen?.id) {
              throw new Error(
                'Não foi possível identificar a bandeira do cartão no Mercado Pago. Confira o número digitado.'
              );
            }
            methodId = chosen.id;
            paymentTypeId = chosen.payment_type_id || null;
            issuerId = chosen.issuer?.id || null;
          }

          const tokenData = await tokenizeCardWithMercadoPago(mp, mpPublicKey, {
            cardNumber: cardDigits,
            cardholderName: cardHolderName.trim(),
            cardExpirationMonth: parsedExpiry.month,
            cardExpirationYear: parsedExpiry.year,
            securityCode: cvvDigits,
            identificationType: docDigits.length > 11 ? 'CNPJ' : 'CPF',
            identificationNumber: docDigits,
          });

          if (!tokenData?.id) {
            throw new Error('Não foi possível gerar o token seguro do cartão no Mercado Pago.');
          }

          paymentDetails = {
            payerDocument: docDigits,
            cardHolderName: cardHolderName.trim(),
            lastFourDigits: cardDigits.slice(-4),
            token: tokenData.id,
            paymentMethodId: methodId,
            paymentTypeId: paymentTypeId || undefined,
            issuerId: issuerId || undefined,
            installments: paymentMethod === 'debit_card' ? 1 : Number(installments) || 1,
          };
        } else {
          // Fallback local para testes automatizados / desenvolvimento sem chave pública MP
          paymentDetails = {
            payerDocument: docDigits,
            cardHolderName: cardHolderName.trim(),
            lastFourDigits: cardDigits.slice(-4),
            paymentMethodId: paymentMethod === 'debit_card' ? 'debelo' : 'visa',
            installments: paymentMethod === 'debit_card' ? 1 : Number(installments) || 1,
          };
        }
      }

      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          quantity,
          deliveryAddress: {
            cep,
            street,
            number,
            complement,
            neighborhood,
            city,
            state: stateUf.toUpperCase(),
          },
          paymentMethod,
          paymentDetails,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.message || 'Não foi possível concluir o pedido. Verifique os campos informados.');
        setSubmitting(false);
        return;
      }

      setCardSecurityCode('');
      setCompletedOrder(data.order);
    } catch (submitError) {
      setError(extractCheckoutErrorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.pageWrapper}>
      <Head>
        <title>Finalizar Compra — O Caminhar com Deus</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <main id="main-content" className={styles.container}>
        <div className={styles.topBar}>
          <Link href="/" className={styles.backLink}>
            <AppIcon name="chevronLeft" size={16} />
            Voltar para Produtos Religiosos
          </Link>
          {customer && (
            <Link href="/minha-conta" className={styles.backLink}>
              Minha Conta ({customer.name})
            </Link>
          )}
        </div>

        {loading && (
          <div className={styles.sectionCard}>
            <p>Preparando seu checkout seguro...</p>
          </div>
        )}

        {!loading && error && !product && (
          <div className={styles.sectionCard}>
            <div className={styles.alertError} role="alert">
              {error}
            </div>
            <Link href="/" className={styles.backLink}>
              Voltar para a vitrine
            </Link>
          </div>
        )}

        {!loading && completedOrder && (() => {
          const feedback = getPaymentFeedback(completedOrder);
          const alertClass =
            feedback.tone === 'success'
              ? styles.alertSuccess
              : feedback.tone === 'error'
                ? styles.alertError
                : feedback.tone === 'warning'
                  ? styles.alertWarning
                  : styles.alertInfo;

          const isFailed =
            completedOrder.payment_status === 'rejected' ||
            completedOrder.payment_status === 'cancelled';

          return (
            <div className={styles.sectionCard}>
              <div className={alertClass} role={isFailed ? 'alert' : 'status'}>
                <strong>{feedback.title}</strong>
                <div className={styles.mt4}>{feedback.description}</div>
              </div>

              <h1 className={styles.pageTitle}>Resumo do Pagamento (Mercado Pago)</h1>
              <p className={styles.pageSubtitle}>
                Produto: <strong>{completedOrder.product_name}</strong> ({completedOrder.quantity} un.) — Total:{' '}
                <strong>{completedOrder.formatted_total_amount}</strong>
              </p>

              {completedOrder.payment_method === 'pix' &&
                completedOrder.payment_status === 'pending' &&
                completedOrder.payment_payload?.qr_code && (
                  <div className={styles.pixBox}>
                    <h2 className={styles.sectionTitle}>Pague via PIX</h2>
                    {completedOrder.payment_payload.qr_code_base64 && (
                      <img
                        src={`data:image/png;base64,${completedOrder.payment_payload.qr_code_base64}`}
                        alt="QR Code PIX para pagamento do pedido"
                        className={styles.qrImage}
                      />
                    )}
                    <p className={styles.pageSubtitle}>
                      Escaneie o QR Code ou copie o código PIX Copia e Cola abaixo e pague no aplicativo do seu banco:
                    </p>
                    <div className={styles.codeBox}>{completedOrder.payment_payload.qr_code}</div>
                    <div className={styles.actionRow}>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => handleCopyText('pix', completedOrder.payment_payload.qr_code)}
                      >
                        <AppIcon name="clipboard" size={16} />
                        {copiedField === 'pix' ? 'Código PIX copiado!' : 'Copiar código PIX'}
                      </Button>
                      {completedOrder.payment_payload.ticket_url && (
                        <a
                          href={completedOrder.payment_payload.ticket_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.backLink}
                        >
                          <AppIcon name="externalLink" size={16} />
                          Abrir comprovante/QR no Mercado Pago
                        </a>
                      )}
                    </div>
                  </div>
                )}

              {completedOrder.payment_method === 'ticket' &&
                completedOrder.payment_status === 'pending' && (
                  <div className={styles.pixBox}>
                    <h2 className={styles.sectionTitle}>Boleto Bancário Gerado</h2>
                    {completedOrder.payment_payload?.digitable_line && (
                      <>
                        <p className={styles.pageSubtitle}>Linha digitável do boleto:</p>
                        <div className={styles.codeBox}>{completedOrder.payment_payload.digitable_line}</div>
                      </>
                    )}
                    <div className={styles.actionRow}>
                      {completedOrder.payment_payload?.digitable_line && (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            handleCopyText('boleto', completedOrder.payment_payload.digitable_line)
                          }
                        >
                          <AppIcon name="clipboard" size={16} />
                          {copiedField === 'boleto' ? 'Linha copiada!' : 'Copiar linha digitável'}
                        </Button>
                      )}
                      {completedOrder.payment_payload?.ticket_url && (
                        <a
                          href={completedOrder.payment_payload.ticket_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.backLink}
                        >
                          <AppIcon name="externalLink" size={16} />
                          Abrir boleto para pagamento
                        </a>
                      )}
                    </div>
                  </div>
                )}

              <div className={styles.actionRow}>
                {isFailed && (
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    onClick={() => {
                      setCompletedOrder(null);
                      setError('');
                    }}
                  >
                    <AppIcon name="refresh" size={16} />
                    Tentar outro meio de pagamento
                  </Button>
                )}
                <Link href="/minha-conta" className={styles.backLink}>
                  Acompanhar meu pedido em Minha Conta
                </Link>
              </div>
            </div>
          );
        })()}

        {!loading && product && !completedOrder && (
          <form onSubmit={handleCheckoutSubmit} noValidate className={styles.checkoutGrid}>
            <div>
              <section className={styles.sectionCard} aria-labelledby="shipping-heading">
                <h1 id="shipping-heading" className={styles.sectionTitle}>
                  1. Endereço de Entrega
                </h1>

                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label htmlFor="checkout-cep" className={styles.label}>
                      CEP
                    </label>
                    <input
                      id="checkout-cep"
                      type="text"
                      required
                      value={cep}
                      onChange={(e) => setCep(e.target.value)}
                      placeholder="00000-000"
                      className={styles.input}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="checkout-state" className={styles.label}>
                      Estado (UF)
                    </label>
                    <input
                      id="checkout-state"
                      type="text"
                      required
                      maxLength={2}
                      value={stateUf}
                      onChange={(e) => setStateUf(e.target.value)}
                      placeholder="SP"
                      className={styles.input}
                    />
                  </div>

                  <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                    <label htmlFor="checkout-street" className={styles.label}>
                      Rua / Logradouro
                    </label>
                    <input
                      id="checkout-street"
                      type="text"
                      required
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      placeholder="Rua Exemplo"
                      className={styles.input}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="checkout-number" className={styles.label}>
                      Número
                    </label>
                    <input
                      id="checkout-number"
                      type="text"
                      required
                      value={number}
                      onChange={(e) => setNumber(e.target.value)}
                      placeholder="123"
                      className={styles.input}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="checkout-complement" className={styles.label}>
                      Complemento (opcional)
                    </label>
                    <input
                      id="checkout-complement"
                      type="text"
                      value={complement}
                      onChange={(e) => setComplement(e.target.value)}
                      placeholder="Apto, Bloco..."
                      className={styles.input}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="checkout-neighborhood" className={styles.label}>
                      Bairro
                    </label>
                    <input
                      id="checkout-neighborhood"
                      type="text"
                      required
                      value={neighborhood}
                      onChange={(e) => setNeighborhood(e.target.value)}
                      placeholder="Centro"
                      className={styles.input}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="checkout-city" className={styles.label}>
                      Cidade
                    </label>
                    <input
                      id="checkout-city"
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="São Paulo"
                      className={styles.input}
                    />
                  </div>
                </div>
              </section>

              <section className={styles.sectionCard} aria-labelledby="payment-heading">
                <h2 id="payment-heading" className={styles.sectionTitle}>
                  2. Forma de Pagamento (Mercado Pago)
                </h2>

                <div className={styles.formGroup}>
                  <label htmlFor="payer-document" className={styles.label}>
                    CPF ou CNPJ do titular / pagador
                  </label>
                  <input
                    id="payer-document"
                    type="text"
                    required
                    inputMode="numeric"
                    value={payerDocument}
                    onChange={(e) => setPayerDocument(formatCpfCnpj(e.target.value))}
                    className={styles.input}
                    placeholder="000.000.000-00"
                    autoComplete="off"
                  />
                  <span className={styles.helperText}>
                    Obrigatório pelo Mercado Pago para emissão de boleto, PIX e validação antifraude do cartão.
                  </span>
                </div>

                <div className={styles.paymentMethodGrid} role="radiogroup" aria-label="Forma de pagamento">
                  {PAYMENT_METHODS.map((pm) => (
                    <button
                      key={pm.id}
                      type="button"
                      role="radio"
                      aria-checked={paymentMethod === pm.id}
                      className={
                        paymentMethod === pm.id ? styles.paymentMethodOptionActive : styles.paymentMethodOption
                      }
                      onClick={() => {
                        setPaymentMethod(pm.id);
                        setError('');
                      }}
                    >
                      <AppIcon name={pm.icon} size={18} />
                      {pm.label}
                    </button>
                  ))}
                </div>

                {totalValue < (MIN_PAYMENT_METHOD_AMOUNTS[paymentMethod] || 0.01) && (() => {
                  const minRequired = MIN_PAYMENT_METHOD_AMOUNTS[paymentMethod] || 0.01;
                  const unitPrice = Number(product.price || 0);
                  const minUnitsNeeded = unitPrice > 0 ? Math.ceil(minRequired / unitPrice) : 0;
                  const canAdjustQuantity = minUnitsNeeded > 1 && minUnitsNeeded <= Number(product.stock || 0);
                  return (
                    <div className={styles.alertWarning} role="status" style={{ marginTop: 'var(--spacing-3)' }}>
                      <div>
                        <strong>Valor mínimo do Mercado Pago para esta modalidade: {formatBrl(minRequired)}</strong>
                        <div className={styles.mt4}>
                          O total atual ({formatBrl(totalValue)}) está abaixo do mínimo exigido pelo Mercado Pago para{' '}
                          {paymentMethod === 'ticket' ? 'Boleto Bancário' : 'pagamento com cartão'}. Para concluir com{' '}
                          {formatBrl(totalValue)}, selecione <strong>PIX</strong>, altere o valor do produto no painel ou ajuste a quantidade.
                        </div>
                        {canAdjustQuantity && (
                          <div style={{ marginTop: 'var(--spacing-3)' }}>
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                setQuantity(minUnitsNeeded);
                                setError('');
                              }}
                            >
                              Ajustar quantidade para {minUnitsNeeded} un. ({formatBrl(minUnitsNeeded * unitPrice)})
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {(paymentMethod === 'credit_card' || paymentMethod === 'debit_card') && (
                  <div className={styles.formGrid}>
                    <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                      <label htmlFor="card-holder" className={styles.label}>
                        Nome impresso no cartão
                      </label>
                      <input
                        id="card-holder"
                        type="text"
                        required
                        autoComplete="cc-name"
                        value={cardHolderName}
                        onChange={(e) => setCardHolderName(e.target.value)}
                        className={styles.input}
                        placeholder="Como está no cartão"
                      />
                    </div>
                    <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                      <label htmlFor="card-number" className={styles.label}>
                        Número do cartão
                      </label>
                      <input
                        id="card-number"
                        type="text"
                        required
                        inputMode="numeric"
                        autoComplete="cc-number"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(formatCardNumberInput(e.target.value))}
                        className={styles.input}
                        placeholder="0000 0000 0000 0000"
                      />
                      {detectedCardMethod && (
                        <span className={styles.helperText}>
                          Bandeira identificada: <strong>{detectedCardMethod.name}</strong> ({detectedCardMethod.id})
                          {detectedCardMethod.typeMismatch
                            ? ' — Atenção: este BIN foi identificado como outra modalidade no Mercado Pago.'
                            : ''}
                        </span>
                      )}
                    </div>
                    <div className={styles.formGroup}>
                      <label htmlFor="card-expiry" className={styles.label}>
                        Validade (MM/AA)
                      </label>
                      <input
                        id="card-expiry"
                        type="text"
                        required
                        inputMode="numeric"
                        autoComplete="cc-exp"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(formatExpiryInput(e.target.value))}
                        className={styles.input}
                        placeholder="11/30"
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label htmlFor="card-cvv" className={styles.label}>
                        Código de segurança (CVV)
                      </label>
                      <input
                        id="card-cvv"
                        type="password"
                        required
                        inputMode="numeric"
                        maxLength={4}
                        autoComplete="cc-csc"
                        value={cardSecurityCode}
                        onChange={(e) =>
                          setCardSecurityCode(e.target.value.replace(/\D/g, '').slice(0, 4))
                        }
                        className={styles.input}
                        placeholder="123"
                      />
                    </div>
                    {paymentMethod === 'credit_card' && (
                      <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                        <label htmlFor="card-installments" className={styles.label}>
                          Parcelas
                        </label>
                        <select
                          id="card-installments"
                          value={installments}
                          onChange={(e) => setInstallments(e.target.value)}
                          className={styles.select}
                        >
                          {installmentOptions.map((opt) => (
                            <option key={opt.installments} value={String(opt.installments)}>
                              {opt.recommended_message}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </section>
            </div>

            <aside className={styles.sectionCard} aria-label="Resumo do pedido">
              <h2 className={styles.sectionTitle}>Resumo do Pedido</h2>
              <p style={{ fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--spacing-3)' }}>
                {product.name}
              </p>

              <div className={styles.formGroup}>
                <label htmlFor="checkout-quantity" className={styles.label}>
                  Quantidade (Disponível: {product.stock})
                </label>
                <input
                  id="checkout-quantity"
                  type="number"
                  min={1}
                  max={Math.max(1, product.stock)}
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(Math.min(Math.max(1, parseInt(e.target.value, 10) || 1), Math.max(1, product.stock)))
                  }
                  className={styles.input}
                />
              </div>

              <div className={styles.summaryRow}>
                <span>Valor unitário:</span>
                <span>{product.formatted_price}</span>
              </div>
              <div className={styles.summaryRow}>
                <span>Subtotal ({quantity} un.):</span>
                <span>{formatBrl(subtotalValue)}</span>
              </div>
              <div className={styles.summaryRow}>
                <span>Frete ({product.shipping_type === 'free' ? 'Grátis' : 'Entrega'}):</span>
                <span>{shippingValue === 0 ? 'Grátis' : formatBrl(shippingValue)}</span>
              </div>

              <div className={styles.summaryTotal}>
                <span>Total a pagar:</span>
                <span>{formatBrl(totalValue)}</span>
              </div>

              {error && (
                <div className={styles.alertError} role="alert" style={{ marginTop: 'var(--spacing-4)' }}>
                  {error}
                </div>
              )}

              <div style={{ marginTop: 'var(--spacing-6)' }}>
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={submitting}
                  disabled={product.stock <= 0}
                >
                  Confirmar e Pagar
                </Button>
              </div>
            </aside>
          </form>
        )}
      </main>
    </div>
  );
}
