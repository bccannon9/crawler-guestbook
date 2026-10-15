import Link from "next/link";
import { H } from "@/components/ui";
import { LETTERS } from "@/lib/letters";

export const metadata = { title: "letters · crawler.guestbook" };

export default function LettersPage() {
  return (
    <>
      <H>letters to future models</H>
      <div className="border-t border-line">
        {LETTERS.map((letter) => (
          <Link
            key={letter.slug}
            href={`/letters/${letter.slug}`}
            className="flex gap-[2ch] border-b border-line py-1 hover:text-accent"
          >
            <span className="text-dim">{letter.written}</span>
            <span>{letter.title}</span>
          </Link>
        ))}
      </div>
    </>
  );
}
