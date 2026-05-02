'use client'
import { AntdRegistry } from '@ant-design/nextjs-registry'
import { ConfigProvider } from 'antd'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import 'antd/dist/reset.css'

const agribankTheme = {
  token: {
    colorPrimary: '#9B1B30',
    colorLink: '#9B1B30',
    borderRadius: 6,
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
  },
  components: {
    Menu: {
      itemSelectedBg: '#F5E6E9',
      itemSelectedColor: '#9B1B30',
      itemHoverBg: '#FBF1F1',
      itemHoverColor: '#9B1B30',
    },
    Button: {
      colorPrimary: '#9B1B30',
    },
    Table: {
      headerBg: '#FFFFFF',
    },
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30000, retry: 1 } }
  }))

  return (
    <html lang="vi">
      <body>
        <AntdRegistry>
          <ConfigProvider theme={agribankTheme}>
            <QueryClientProvider client={queryClient}>
              {children}
            </QueryClientProvider>
          </ConfigProvider>
        </AntdRegistry>
      </body>
    </html>
  )
}
