import { NextRequest, NextResponse } from "next/server";
import { deleteImage } from "@/lib/cloudinary";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ publicId: string }> },
) {
  // TODO: Add authentication check when auth is implemented
  // const session = await getServerAuthSession()
  // if (!session?.user) {
  //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  // }

  try {
    // Decode the public ID (it may contain slashes)
    const { publicId } = await params;
    const decodedPublicId = decodeURIComponent(publicId);

    await deleteImage(decodedPublicId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 },
    );
  }
}
