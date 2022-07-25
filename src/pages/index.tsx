import type { NextPage } from "next";
import { signIn, signOut } from "next-auth/react";
import Head from "next/head";
import Image from "next/image";
import { trpc } from "../utils/trpc";

const Home: NextPage = () => {
  const hello = trpc.proxy.example.hello.useQuery({ text: "from tRPC" });

  return (
    <>
      <Head>
        <title>Create T3 App</title>
        <meta name="description" content="Generated by create-t3-app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="container flex flex-col items-center justify-center h-screen p-4 mx-auto">
        <h1 className="text-5xl md:text-[5rem] leading-normal font-extrabold text-gray-700">
          Create <span className="text-purple-300">T3</span> App
        </h1>
        <div>
          <AuthShowcase />
        </div>
        <div className="flex items-center justify-center w-full pt-6 text-2xl text-blue-500">
          {hello.data ? <p>{hello.data.greeting}</p> : <p>Loading..</p>}
        </div>
      </main>
    </>
  );
};

export default Home;

// Component to showcase protected routes using Auth
const AuthShowcase: React.FC = () => {
  const { data: sessionData } = trpc.proxy.auth.getSession.useQuery();
  const { data: secretMessage } = trpc.proxy.auth.getSecretMessage.useQuery();

  return (
    <div>
      {sessionData && <p>Logged in as {sessionData?.user?.name}</p>}
      {secretMessage && <p>{secretMessage}</p>}
      {sessionData?.user?.image && (
        <Image
          src={sessionData.user.image || ""}
          width={64}
          height={64}
          alt={sessionData?.user?.name}
        />
      )}
      <button
        className="px-4 py-2 border-2 border-blue-500 rounded-md"
        onClick={sessionData ? () => signOut() : () => signIn()}
      >
        {sessionData ? "Sign out" : "Sign in"}
      </button>
      <pre>
        <code>{JSON.stringify(sessionData, null, 2)}</code>
      </pre>
    </div>
  );
};
