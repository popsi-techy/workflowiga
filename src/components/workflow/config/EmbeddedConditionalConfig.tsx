"use client";



import { useState } from "react";

import { useWorkflowStore } from "@/lib/workflow/store";

import { CONDITIONAL_ATTRIBUTES, APPROVAL_CONDITIONAL_ATTRIBUTES } from "@/lib/workflow/mock-data";

import {

  addElseIfBranch,

  addElseBranch,

  applyConditionCount,

  isConditionalSetupComplete,

  removeConditionBranch,

  removeElseBranch,

  resolveConditionCount,

  resolveElseEnabled,

} from "@/lib/workflow/conditional-branch";

import type { EmbeddedConditionalData, SplitBranchData } from "@/lib/workflow/types";

import { RoutingBranchLadder } from "./RoutingBranchLadder";

import { ConditionalBranchSetup } from "./ConditionalBranchSetup";

import { ConfigBody, ConfigSection } from "./config-layout";



export function EmbeddedConditionalConfig({

  hostLevelId,

  data,

}: {

  hostLevelId: string;

  data: EmbeddedConditionalData;

}) {

  const updateNode = useWorkflowStore((s) => s.updateNode);

  const editorContext = useWorkflowStore((s) => s.editorContext);

  const routingAttributes =

    editorContext === "approval"

      ? APPROVAL_CONDITIONAL_ATTRIBUTES

      : CONDITIONAL_ATTRIBUTES;

  const hasElseBranch = resolveElseEnabled(data);

  const [pendingCount, setPendingCount] = useState(

    Math.max(1, resolveConditionCount(data) || 1),

  );



  const setupComplete = isConditionalSetupComplete(data);



  function patch(fields: Partial<EmbeddedConditionalData>) {

    updateNode(hostLevelId, {

      embeddedConditional: { ...data, ...fields },

    } as unknown as Partial<import("@/lib/workflow/types").WorkflowNode["data"]>);

  }



  function createRoutes() {

    patch(applyConditionCount(data, pendingCount));

  }



  function patchBranch(branchId: string, fields: Partial<SplitBranchData>) {

    patch({

      branches: data.branches.map((b) =>

        b.id === branchId ? { ...b, ...fields } : b,

      ),

    });

  }



  function handleRemoveBranch(branchId: string) {

    const elseBranch = hasElseBranch

      ? data.branches[data.branches.length - 1]

      : undefined;

    if (elseBranch?.id === branchId) {

      const next = removeElseBranch(data);

      if (next) patch(next);

      return;

    }

    const next = removeConditionBranch(data, branchId);

    if (next) patch(next);

  }



  return (

    <div className="flex h-full flex-col">

      <ConfigBody>

        {!setupComplete ? (

          <ConfigSection

            title={data.name || "Nested routing"}

            subtitle="Choose how many conditions to evaluate."

          >

            <ConditionalBranchSetup

              pendingCount={pendingCount}

              onPendingCountChange={setPendingCount}

              onCreate={createRoutes}

            />

          </ConfigSection>

        ) : (

          <>

            <ConfigSection

              title={data.name || "Nested routing"}

              subtitle={

                hasElseBranch

                  ? "First matching condition runs. The ELSE row at the bottom runs when nothing above matches."

                  : "First matching condition runs. Unmatched requests stop after the last branch."

              }

            >

              <RoutingBranchLadder

                branches={data.branches}

                attributes={routingAttributes}

                onPatchBranch={patchBranch}

                onAddElseIf={() => patch(addElseIfBranch(data))}

                onRemoveBranch={handleRemoveBranch}

                hasElseBranch={hasElseBranch}

                onAddElse={() => patch(addElseBranch(data))}

              />

            </ConfigSection>

          </>

        )}

      </ConfigBody>

    </div>

  );

}


