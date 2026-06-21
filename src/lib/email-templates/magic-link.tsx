import * as React from 'react'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
  token?: string
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
  token,
}: MagicLinkEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your {siteName} sign-in code{token ? `: ${token}` : ''}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={card}>
          <Text style={wordmark}>🦊 WILDLOG</Text>
          <Heading style={h1}>Enter this code to sign in</Heading>
          <Text style={text}>
            Type this 6-digit code into the {siteName} window you just left open.
            No app-switching needed.
          </Text>

          {token ? (
            <Section style={codeWrap}>
              <Text style={code}>{token}</Text>
            </Section>
          ) : null}

          <Text style={meta}>
            This code expires shortly. If the code's wrong or expired, just send
            a new one.
          </Text>

          {confirmationUrl ? (
            <Text style={fallback}>
              On the same device? You can also{' '}
              <Link href={confirmationUrl} style={link}>
                tap here to sign in
              </Link>
              .
            </Text>
          ) : null}

          <Text style={footer}>
            If you didn't try to sign in to {siteName}, you can safely ignore
            this email.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' }
const container = { padding: '24px 16px', maxWidth: '480px' }
const card = {
  backgroundColor: '#F7EDE4',
  borderRadius: '20px',
  padding: '32px 28px',
}
const wordmark = {
  fontSize: '18px',
  fontWeight: 'bold' as const,
  letterSpacing: '1px',
  color: '#3C3248',
  margin: '0 0 24px',
}
const h1 = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: '#3C3248',
  margin: '0 0 12px',
}
const text = {
  fontSize: '15px',
  color: '#544869',
  lineHeight: '1.55',
  margin: '0 0 24px',
}
const codeWrap = {
  backgroundColor: '#ffffff',
  border: '2px solid #E8C9AE',
  borderRadius: '16px',
  padding: '18px 12px',
  textAlign: 'center' as const,
  margin: '0 0 20px',
}
const code = {
  fontFamily: 'Courier New, Courier, monospace',
  fontSize: '40px',
  fontWeight: 'bold' as const,
  letterSpacing: '10px',
  color: '#6B7A4F',
  margin: '0',
}
const meta = {
  fontSize: '13px',
  color: '#544869',
  lineHeight: '1.5',
  margin: '0 0 20px',
}
const fallback = {
  fontSize: '13px',
  color: '#544869',
  lineHeight: '1.5',
  margin: '0 0 24px',
}
const link = { color: '#6B7A4F', textDecoration: 'underline' }
const footer = {
  fontSize: '12px',
  color: '#8a8290',
  margin: '0',
  borderTop: '1px solid #E8C9AE',
  paddingTop: '16px',
}
