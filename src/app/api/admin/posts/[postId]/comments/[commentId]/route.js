import {NextResponse} from "next/server";
import {readSessionTokenFromCookies} from "@/lib/ccs/cookiesRead";
import {requireStaff,removeCommentAsStaff} from "@/lib/ccs/admin";
import {staffRoute} from "@/lib/ccs/staffRoute";
import {objectBody} from "@/lib/ccs/requestValidation.mjs";
async function DELETEHandler(request,{params}) {
  const token=await readSessionTokenFromCookies();const gate=await requireStaff(token,{recentAuth:true});
  if(gate.error)return NextResponse.json({error:gate.error},{status:gate.status});
  let body;try{body=await request.json();}catch{return NextResponse.json({error:"Invalid JSON body."},{status:400});}
  objectBody(body,["reason"]);const {postId,commentId}=await params;
  return NextResponse.json(await removeCommentAsStaff(gate.row,postId,commentId,body.reason));
}
export const DELETE=staffRoute(DELETEHandler);
