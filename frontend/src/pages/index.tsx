import dynamic from 'next/dynamic';
import Head from 'next/head';

// Dynamic import to avoid SSR issues with React Flow
const FlowBuilder = dynamic(
    () => import('@/components/flow-builder/FlowBuilder'),
    { ssr: false }
);

export default function Home() {
    return (
        <>
            <Head>
                <title>Referral Flow Builder | Rule-Based Workflow Designer</title>
                <meta
                    name="description"
                    content="Visual flow builder for designing rule-based referral workflows with conditions and actions"
                />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <main className="bg-dark-950 min-h-screen">
                <FlowBuilder />
            </main>
        </>
    );
}
