'use server';

/**
 * @fileOverview An AI agent to categorize new products based on existing product data.
 *
 * - categorizeProduct - A function that suggests product categories.
 * - CategorizeProductInput - The input type for the categorizeProduct function.
 * - CategorizeProductOutput - The return type for the categorizeProduct function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CategorizeProductInputSchema = z.object({
  productName: z.string().describe('The name of the product to categorize.'),
  productDescription: z.string().describe('A description of the product.'),
  exampleProducts: z.array(
    z.object({
      name: z.string().describe('Name of the example product'),
      description: z.string().describe('Description of the example product'),
      category: z.string().describe('Category of the example product'),
    })
  ).describe('A list of example products with their names, descriptions, and categories.'),
});
export type CategorizeProductInput = z.infer<typeof CategorizeProductInputSchema>;

const CategorizeProductOutputSchema = z.object({
  suggestedCategory: z.string().describe('The suggested category for the product.'),
  confidence: z.number().describe('A confidence score (0-1) for the suggested category.'),
});
export type CategorizeProductOutput = z.infer<typeof CategorizeProductOutputSchema>;

export async function categorizeProduct(input: CategorizeProductInput): Promise<CategorizeProductOutput> {
  return categorizeProductFlow(input);
}

const prompt = ai.definePrompt({
  name: 'categorizeProductPrompt',
  input: {schema: CategorizeProductInputSchema},
  output: {schema: CategorizeProductOutputSchema},
  prompt: `You are a product categorization expert. Given the name and description of a new product, and a list of example products with their categories, suggest the most appropriate category for the new product.

New Product Name: {{{productName}}}
New Product Description: {{{productDescription}}}

Example Products:
{{#each exampleProducts}}
- Name: {{{name}}}, Description: {{{description}}}, Category: {{{category}}}
{{/each}}

Suggest a category for the new product and provide a confidence score (0-1) for your suggestion.

{{$responseFormat examples=1}}
`,
});

const categorizeProductFlow = ai.defineFlow(
  {
    name: 'categorizeProductFlow',
    inputSchema: CategorizeProductInputSchema,
    outputSchema: CategorizeProductOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
