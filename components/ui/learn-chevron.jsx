/**
 * The chevron for `24-learn-more-hover`: on hover of an ancestor `.t-learn` it
 * slides right while the two arms spread apart.
 *
 * The geometry is load-bearing and comes from the snippet — `.t-learn-arm` sets
 * `transform-origin: 10px 8px` against a `view-box` transform box, so the arms
 * have to be these two paths in this 16×16 viewBox or they rotate about the
 * wrong point.
 *
 * Shared by the landing hero and the features page so the two can't drift.
 */
export function LearnChevron({ size = 16 }) {
    return (
        <span className="t-learn-chevron">
            <svg
                width={size}
                height={size}
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
            >
                <path className="t-learn-arm t-learn-arm-top" d="M6 4L10 8" />
                <path className="t-learn-arm t-learn-arm-bot" d="M10 8L6 12" />
            </svg>
        </span>
    );
}

export default LearnChevron;
