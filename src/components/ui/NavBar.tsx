"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Loader2, BadgeCheck } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const navigation = [
  { href: "/", label: "Home" },
  { href: "https://github.com/vsvaidya27/VShop-AI", label: "About" },
]

const linkClasses = "text-foreground transition-colors hover:text-foreground"

interface PriceFeed {
  price: number
  timestamp: number
}

interface UserInfo {
  fullName: string
  creditCard: string
  cvv: string
  address: string
  zipcode: string
}

export function NavigationHeader() {
  const [priceFeed, setPriceFeed] = useState<PriceFeed | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showUserInfo, setShowUserInfo] = useState(false)
  const [userInfo, setUserInfo] = useState<UserInfo>({
    fullName: "John Doe",
    creditCard: "4242424242424242",
    cvv: "123",
    address: "123 Main St, Anytown, USA",
    zipcode: "23145"
  })

  const fetchPriceFeed = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/eoracle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uint16: 2 }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Error response:", errorText)
        throw new Error("Failed to fetch price feed")
      }

      const data = await response.json()
      console.log("Fetched Price Feed:", data)

      const numericPrice = Number.parseFloat(data.price)
      const numericTimestamp = Number.parseInt(data.timestamp, 10)

      setPriceFeed({
        price: numericPrice,
        timestamp: numericTimestamp,
      })
    } catch (error) {
      console.error("Error fetching price feed:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUserInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserInfo({ ...userInfo, [e.target.name]: e.target.value })
  }

  const handleSaveUserInfo = () => {
    // Here you would typically save the user info to a backend or local storage
    console.log("Saving user info:", userInfo)
    setShowUserInfo(false)
  }

  return (
    <div className="sticky top-0 flex h-16 items-center justify-between border-b bg-background px-4 md:px-6 z-50">
      <nav className="flex items-center gap-6 text-lg font-medium md:gap-5 md:text-sm lg:gap-6">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold md:text-base">
          <span>VShop AI</span>
        </Link>
        {navigation.map((link) => (
          <Button key={link.href} variant="link" className={cn(linkClasses, "p-0")}>
            <Link href={link.href}>{link.label}</Link>
          </Button>
        ))}
      </nav>

      <div className="flex items-center gap-4">
        {priceFeed && (
          <div className="text-sm font-medium">
            1 ETH = ${priceFeed.price.toFixed(2)} USD
            <div className="text-gray-400 text-sm text-center">
              Data provided by{" "}
              <a href="https://eoracle.io" className="text-blue-400 underline">
                eoracle.io
              </a>{" "}
              AVS
            </div>
          </div>
        )}

        <Button
          onClick={fetchPriceFeed}
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Updating...
            </>
          ) : (
            "Refresh Price"
          )}
        </Button>

        <div className="text-xs text-muted-foreground">
          <ConnectButton />
        </div>

        <Button variant="outline" size="icon" className="rounded-full" onClick={() => setShowUserInfo(true)}>
          <BadgeCheck className="h-4 w-4" />
          <span className="sr-only">User Info</span>
        </Button>

        <AlertDialog open={showUserInfo} onOpenChange={setShowUserInfo}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>User Information</AlertDialogTitle>
              <AlertDialogDescription>View and edit your shipping and billing information.</AlertDialogDescription>
            </AlertDialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="fullName" className="text-right">
                  Full Name
                </Label>
                <Input
                  id="fullName"
                  name="fullName"
                  value={userInfo.fullName}
                  onChange={handleUserInfoChange}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="creditCard" className="text-right">
                  Credit Card
                </Label>
                <Input
                  id="creditCard"
                  name="creditCard"
                  value={userInfo.creditCard}
                  onChange={handleUserInfoChange}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="cvv" className="text-right">
                  CVV
                </Label>
                <Input
                  id="cvv"
                  name="cvv"
                  value={userInfo.cvv}
                  onChange={handleUserInfoChange}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="address" className="text-right">
                  Address
                </Label>
                <Input
                  id="address"
                  name="address"
                  value={userInfo.address}
                  onChange={handleUserInfoChange}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="zipcode" className="text-right">
                  Zipcode
                </Label>
                <Input
                  id="zipcode"
                  name="zipcode"
                  value={userInfo.zipcode}
                  onChange={handleUserInfoChange}
                  className="col-span-3"
                />
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleSaveUserInfo}>Save Changes</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}

