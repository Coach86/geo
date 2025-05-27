import Link from "next/link";

export default function GlossaryPage() {
  return (
    <main className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 fade-in-section is-visible">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            <svg
              className="mr-2 h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Report
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 bg-gray-50">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Mint Glossary
            </h1>
            <p className="mt-2 text-gray-600">
              Definitions and explanations of key terms used in the report
            </p>
          </div>

          <div className="p-6">
            <div className="space-y-8">
              <section id="pulse">
                <h2 className="text-xl font-bold text-primary mb-4">Pulse</h2>
                <div className="bg-blue-50 rounded-lg p-4 mb-6">
                  <p className="text-gray-800">
                    <span className="font-semibold">Pulse Score</span> measures
                    the global visibility of your brand across all tested AI
                    models. It represents the percentage of times your brand is
                    mentioned when AI models are prompted with relevant industry
                    questions.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="border-b border-gray-100 pb-4">
                    <h3 className="font-semibold text-gray-800 mb-2">
                      How is it calculated?
                    </h3>
                    <p className="text-gray-600">
                      We test each AI model with a set of industry-relevant
                      prompts and measure how often your brand is mentioned in
                      the responses. The final score is the percentage of
                      responses that mention your brand across all models and
                      prompts.
                    </p>
                  </div>

                  <div className="border-b border-gray-100 pb-4">
                    <h3 className="font-semibold text-gray-800 mb-2">
                      Why is it important?
                    </h3>
                    <p className="text-gray-600">
                      A higher Pulse score indicates better brand visibility in
                      AI responses, which translates to more exposure when users
                      ask AI assistants about your industry. This is becoming an
                      increasingly important channel for brand discovery.
                    </p>
                  </div>
                </div>
              </section>

              <section id="tone">
                <h2 className="text-xl font-bold text-[#673AB7] mb-4">Tone</h2>
                <div className="bg-[#EDE7F6] rounded-lg p-4 mb-6">
                  <p className="text-gray-800">
                    <span className="font-semibold">Tone Score</span> measures
                    the sentiment of AI responses when discussing your brand. It
                    ranges from -1.0 (extremely negative) to +1.0 (extremely
                    positive).
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="border-b border-gray-100 pb-4">
                    <h3 className="font-semibold text-gray-800 mb-2">
                      How is it calculated?
                    </h3>
                    <p className="text-gray-600">
                      We analyze the sentiment of AI responses to questions
                      specifically about your brand. The responses are
                      categorized as positive, neutral, or negative, and a
                      weighted average produces the final score.
                    </p>
                  </div>

                  <div className="border-b border-gray-100 pb-4">
                    <h3 className="font-semibold text-gray-800 mb-2">
                      Sentiment Categories
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                      <div className="bg-[#E3F2FD] p-3 rounded">
                        <p className="font-medium text-[#0D47A1]">
                          Positive (+0.1 to +1.0)
                        </p>
                        <p className="text-sm text-gray-700 mt-1">
                          Favorable mentions, highlighting strengths and
                          benefits
                        </p>
                      </div>
                      <div className="bg-[#EDE7F6] p-3 rounded">
                        <p className="font-medium text-[#4527A0]">
                          Neutral (-0.1 to +0.1)
                        </p>
                        <p className="text-sm text-gray-700 mt-1">
                          Balanced or factual mentions without strong sentiment
                        </p>
                      </div>
                      <div className="bg-[#FCE4EC] p-3 rounded">
                        <p className="font-medium text-[#AD1457]">
                          Negative (-1.0 to -0.1)
                        </p>
                        <p className="text-sm text-gray-700 mt-1">
                          Critical mentions, highlighting weaknesses or issues
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section id="accord">
                <h2 className="text-xl font-bold text-[#2196F3] mb-4">
                  Accord
                </h2>
                <div className="bg-[#E3F2FD] rounded-lg p-4 mb-6">
                  <p className="text-gray-800">
                    <span className="font-semibold">Accord Score</span> measures
                    how well AI models' descriptions of your brand align with
                    your desired brand attributes and messaging.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="border-b border-gray-100 pb-4">
                    <h3 className="font-semibold text-gray-800 mb-2">
                      How is it calculated?
                    </h3>
                    <p className="text-gray-600">
                      We analyze AI responses for mentions of key brand
                      attributes that you've identified as important to your
                      brand identity. The score reflects how frequently these
                      attributes are mentioned and how strongly they're
                      associated with your brand.
                    </p>
                  </div>

                  <div className="border-b border-gray-100 pb-4">
                    <h3 className="font-semibold text-gray-800 mb-2">
                      Alignment Levels
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                      <div className="bg-[#E3F2FD] p-3 rounded">
                        <p className="font-medium text-[#0D47A1]">
                          High Alignment
                        </p>
                        <p className="text-sm text-gray-700 mt-1">
                          Attribute is strongly associated with your brand
                        </p>
                      </div>
                      <div className="bg-[#EDE7F6] p-3 rounded">
                        <p className="font-medium text-[#4527A0]">
                          Medium Alignment
                        </p>
                        <p className="text-sm text-gray-700 mt-1">
                          Attribute is sometimes associated with your brand
                        </p>
                      </div>
                      <div className="bg-[#FCE4EC] p-3 rounded">
                        <p className="font-medium text-[#AD1457]">
                          Low Alignment
                        </p>
                        <p className="text-sm text-gray-700 mt-1">
                          Attribute is rarely associated with your brand
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section id="arena">
                <h2 className="text-xl font-bold text-[#805AD5] mb-4">Arena</h2>
                <div className="bg-[#EDE7F6] rounded-lg p-4 mb-6">
                  <p className="text-gray-800">
                    <span className="font-semibold">Arena Analysis</span>{" "}
                    identifies which competitors are most frequently mentioned
                    alongside your brand in AI responses, and how your brand
                    compares to them.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="border-b border-gray-100 pb-4">
                    <h3 className="font-semibold text-gray-800 mb-2">
                      How is it calculated?
                    </h3>
                    <p className="text-gray-600">
                      We analyze AI responses to industry-relevant prompts and
                      identify which competitors are mentioned most frequently.
                      We also analyze direct comparison prompts to identify
                      perceived strengths and weaknesses relative to each
                      competitor.
                    </p>
                  </div>

                  <div className="border-b border-gray-100 pb-4">
                    <h3 className="font-semibold text-gray-800 mb-2">
                      Competitive Positioning
                    </h3>
                    <p className="text-gray-600">
                      The size and color of competitor bubbles in the
                      visualization indicate their prominence and sentiment in
                      AI responses. Larger bubbles represent more frequently
                      mentioned competitors.
                    </p>
                  </div>
                </div>
              </section>

              <section id="trace">
                <h2 className="text-xl font-bold text-[#1976D2] mb-4">Trace</h2>
                <div className="bg-[#E3F2FD] rounded-lg p-4 mb-6">
                  <p className="text-gray-800">
                    <span className="font-semibold">Trace Analysis</span>{" "}
                    identifies the sources that AI models reference when
                    discussing your brand, and how frequently they access the
                    web for information.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="border-b border-gray-100 pb-4">
                    <h3 className="font-semibold text-gray-800 mb-2">
                      Source Distribution
                    </h3>
                    <p className="text-gray-600">
                      This shows which websites and platforms AI models
                      reference when discussing your brand. This helps identify
                      which online sources have the most influence on AI
                      perceptions of your brand.
                    </p>
                  </div>

                  <div className="border-b border-gray-100 pb-4">
                    <h3 className="font-semibold text-gray-800 mb-2">
                      Web Access Rate
                    </h3>
                    <p className="text-gray-600">
                      This shows how often each AI model accesses the web when
                      responding to prompts about your brand or industry. Models
                      with higher web access rates are more likely to reference
                      recent information.
                    </p>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
