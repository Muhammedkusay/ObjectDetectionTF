
function PredText({predictions}) {

    return(
        <div className="flex gap-2 absolute bottom-6">              
            {predictions.map((pred, index)=> (
                <p key={index} className="px-2.5 py-1.5 rounded-lg bg-gray-100 border border-gray-300 text-gray-700 capitalize">
                    {pred.class}
                </p>
            ))}
        </div>
    )
}

export default PredText