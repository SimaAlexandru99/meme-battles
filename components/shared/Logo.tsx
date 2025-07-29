import Image from "next/image";

export function Logo() {
  return (
    <div className="flex h-20 w-20 items-center justify-center">
      <Image src="/logo.png" alt="Meme Battles Logo" width={100} height={100} />
    </div>
  );
}
