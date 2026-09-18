import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {title:"BoraVaga — seu próximo passo",description:"Encontre vagas por nível, modalidade e localização.",icons:{icon:"/favicon.svg"}};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="pt-BR"><body>{children}</body></html>}
