// Visual drag handle shown only on mobile bottom-sheet modals.
// Purely cosmetic — real swipe-to-dismiss would need a refactor onto
// @radix-ui/react-dialog or framer-motion.
export default function SheetHandle() {
  return (
    <div className="flex justify-center pt-2 pb-1 sm:hidden">
      <div className="h-1 w-10 rounded-full bg-neutral-300" />
    </div>
  );
}
