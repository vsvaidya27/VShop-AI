# VShop AI: Voice-Driven, Multi-Currency E-Commerce

VShop AI is a **voice-first, AI-driven shopping agent** that bridges the digital divide for seniors and newcomers, while also **empowering crypto users** to pay with ETH. By simply **speaking** your shopping requests, you can find, validate, and purchase products—whether you prefer **USD** or **crypto**.

---

## Core Features

### Voice-Powered Shopping
- **Natural Language**: Speak your request (e.g., "Find me tennis balls"), and VShop AI handles the rest.  
- **ElevenLabs Audio**: The system can respond audibly, providing a hands-free experience for visually impaired or tech-shy users.

### ASIN Validation
- **No Hallucinated Products**: VShop AI retrieves real Amazon product IDs (ASINs) and validates them via an external API.

### RAG Pipeline
- **Exa AI + OpenAI**: A custom Retrieval Augmented Generation approach ensures relevant product listings.  
- **Perplexity** (Optional): Integrates if you want an alternative LLM-based search, though we rely primarily on Exa AI for reliability.

### Multi-Currency Checkout
- **USD or ETH**: Pay with traditional currency or via **RainbowKit + Wagmi** for a seamless crypto checkout.  
- **EigenLayer AVS**: VShop AI uses a non-centralized oracle (eoracle) to fetch ETH–USD prices from multiple operators, ensuring reliable data.

---

## Getting Started

1. **Clone & Install**  
   ```bash
   git clone https://github.com/<your-repo>/vshop-ai.git
   cd vshop-ai
   npm install

2. Set Up Environment
    Create a .env.local with your keys:

    OPENAI_API_KEY=
    PERPLEXITY_API_KEY=
    EXA_API_KEY=
    RYE_BASIC_PROD=
    RYE_BASIC_PAY=
    NEXT_PUBLIC_ELEVENLABS_API_KEY=

These environment variables are required for AI-driven parsing, product data retrieval, and multi-currency checkout.

3. Run Development Server

    npm run dev
    # Open http://localhost:3000