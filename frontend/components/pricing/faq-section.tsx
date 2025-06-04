import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export const faqItems: FaqItem[] = [
  {
    id: "faq-1",
    question: "Can I cancel my subscription?",
    answer:
      "Yes, you can cancel your subscription at any time. Your access will continue until the end of your current billing period.",
  },
  {
    id: "faq-2",
    question: "What if my brand isn't mentioned yet?",
    answer:
      "This is actually common for newer brands and a perfect time to start monitoring. Our platform will help you understand why your brand might not be appearing and provide strategies to increase visibility in AI responses.",
  },
  {
    id: "faq-3",
    question: "Can I test custom prompts?",
    answer:
      "Yes, on our Agencies and Enterprise plans, you can create and test custom prompts to see how AI models respond to specific scenarios relevant to your brand or industry.",
  },
  {
    id: "faq-4",
    question: "Does this impact SEO?",
    answer:
      "While our platform doesn't directly impact SEO, the insights you gain about how AI models perceive your brand can inform your content strategy, which can indirectly benefit your SEO efforts.",
  },
  {
    id: "faq-5",
    question: "Can I monitor multiple brands?",
    answer:
      "Yes, depending on your plan. The Starter plan includes 1 brand, Growth includes up to 3 brands, Enterprise includes up to 15 brands, and Agencies offers unlimited brand monitoring.",
  },
  {
    id: "faq-6",
    question: "Do you offer refunds?",
    answer:
      "We offer a 30-day money-back guarantee. If you're not satisfied with our service within the first 30 days after your trial ends, we'll refund your payment - no questions asked.",
  },
];

interface FaqSectionProps {
  items?: FaqItem[];
}

export function FaqSection({ items = faqItems }: FaqSectionProps) {
  return (
    <section className="max-w-3xl mx-auto px-4 sm:px-6 mb-16">
      <h2 className="text-2xl md:text-3xl font-bold text-center mb-10 text-mono-900">
        Frequently Asked Questions
      </h2>
      <Accordion type="single" collapsible className="space-y-4">
        {items.map((item) => (
          <AccordionItem
            key={item.id}
            value={item.id}
            className="border rounded-lg overflow-hidden"
          >
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <span className="text-left font-medium text-mono-800 text-sm">
                {item.question}
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-4 pt-0 text-mono-600">
              {item.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}