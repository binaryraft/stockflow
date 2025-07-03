
'use server';
/**
 * @fileOverview An AI agent for extracting structured data from bill/invoice images.
 *
 * - extractBillItems - A function that takes an image of a bill and returns structured line items.
 * - BillExtractInput - The input type for the extractBillItems function.
 * - BillExtractOutput - The return type for the extractBillItems function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {v4 as uuidv4} from 'uuid';

const BillItemSchema = z.object({
  id: z.string().default(() => uuidv4()),
  productName: z.string().describe("The full name of the product or service, including any variants (e.g., 'T-Shirt - Red, Medium')."),
  quantity: z.number().describe("The quantity of the item purchased."),
  price: z.number().describe("The price PER UNIT of the item."),
});

const BillExtractInputSchema = z.object({
  billImage: z.string().describe("An image of a bill or invoice, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
});
export type BillExtractInput = z.infer<typeof BillExtractInputSchema>;

const BillExtractOutputSchema = z.object({
  items: z.array(BillItemSchema).describe("An array of line items extracted from the bill."),
  unrecognizedItems: z.array(z.string()).describe("A list of any line items or text from the bill that could not be confidently structured into a BillItem."),
});
export type BillExtractOutput = z.infer<typeof BillExtractOutputSchema>;


const extractBillItemsPrompt = ai.definePrompt(
  {
    name: 'extractBillItemsPrompt',
    model: 'gemini-1.5-flash',
    input: { schema: BillExtractInputSchema },
    output: { schema: BillExtractOutputSchema },
    prompt: `You are an expert data extraction agent specializing in reading invoices and bills. Your task is to analyze the provided image of a bill and extract all line items into a structured JSON format.

    Carefully identify each distinct product or service. For each item, extract its name, the quantity purchased, and the price per single unit.

    - For 'productName', capture the most descriptive name available.
    - For 'quantity', identify the number of units.
    - For 'price', ensure you are extracting the PRICE PER UNIT, not the total price for that line item. You may need to calculate this by dividing the total price by the quantity.

    If you encounter any text or lines that seem like items but you cannot confidently structure them into the required format (e.g., ambiguous descriptions, missing quantity or price), add them to the 'unrecognizedItems' array as strings.

    Do not include taxes, discounts, or total bill amounts as line items. Focus only on the purchased products or services.

    Analyze the following bill image:
    {{media url=billImage}}`,
  }
);


const extractBillItemsFlow = ai.defineFlow(
  {
    name: 'extractBillItemsFlow',
    inputSchema: BillExtractInputSchema,
    outputSchema: BillExtractOutputSchema,
  },
  async (input) => {
    const { output } = await extractBillItemsPrompt(input);
    return output!;
  }
);


export async function extractBillItems(input: BillExtractInput): Promise<BillExtractOutput> {
  return extractBillItemsFlow(input);
}
    
