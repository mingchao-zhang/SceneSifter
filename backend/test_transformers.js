import { pipeline, layer_norm } from '@xenova/transformers';


async function main() {
    // Create a feature extraction pipeline
    const extractor = await pipeline('feature-extraction', 'nomic-ai/nomic-embed-text-v1.5', {
        quantized: false, // Comment out this line to use the quantized version
    });

    // Define sentences
    const texts = ['search_query: What is TSNE?', 'search_query: Who is Laurens van der Maaten?'];

    // Compute sentence embeddings
    let embeddings = await extractor(texts, { pooling: 'mean' });
    console.log(embeddings); // Tensor of shape [2, 768]

    const matryoshka_dim = 512;
    embeddings = layer_norm(embeddings, [embeddings.dims[1]])
        .slice(null, [0, matryoshka_dim])
        .normalize(2, -1);
    console.log(embeddings.tolist());
}

main()